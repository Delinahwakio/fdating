import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type UserRole = 'real_user' | 'operator' | 'admin' | null

async function getUserRole(supabase: any, userId: string): Promise<UserRole> {
  console.log('[Middleware] Checking role for user:', userId)
  
  // Check if user is an admin
  const { data: adminData, error: adminError } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  console.log('[Middleware] Admin check:', { adminData, adminError })

  if (adminData) {
    console.log('[Middleware] User is admin')
    return 'admin'
  }

  // Check if user is an operator
  const { data: operatorData, error: operatorError } = await supabase
    .from('operators')
    .select('id, is_active')
    .eq('id', userId)
    .maybeSingle()

  console.log('[Middleware] Operator check:', { operatorData, operatorError })

  if (operatorData) {
    // Only return operator role if the account is active
    if (!operatorData.is_active) {
      console.log('[Middleware] Operator account is inactive')
      return null // Deactivated operators cannot access the system
    }
    console.log('[Middleware] User is operator')
    return 'operator'
  }

  // Check if user is a real user
  const { data: realUserData, error: realUserError } = await supabase
    .from('real_users')
    .select('id, is_active')
    .eq('id', userId)
    .maybeSingle()

  console.log('[Middleware] Real user check:', { realUserData, realUserError })

  if (realUserData) {
    // Only return real_user role if the account is active
    if (!realUserData.is_active) {
      console.log('[Middleware] Real user account is inactive')
      return null // Deactivated users cannot access the system
    }
    console.log('[Middleware] User is real_user')
    return 'real_user'
  }

  console.log('[Middleware] No role found for user')
  return null
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check maintenance mode (except for admins, maintenance page, and setup)
  if (pathname !== '/maintenance' && pathname !== '/setup' && !pathname.startsWith('/admin') && !pathname.startsWith('/api/setup')) {
    try {
      console.log('[Middleware] Checking maintenance mode')
      const { data: maintenanceConfig, error: maintenanceError } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle()

      console.log('[Middleware] Maintenance config:', { maintenanceConfig, maintenanceError })

      const isMaintenanceMode = maintenanceConfig?.value === 'true' || maintenanceConfig?.value === true

      if (isMaintenanceMode) {
        console.log('[Middleware] Platform is in maintenance mode')
        // Check if user is admin
        let isAdmin = false
        if (user) {
          const { data: adminData, error: adminCheckError } = await supabase
            .from('admins')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()
          console.log('[Middleware] Admin check for maintenance bypass:', { adminData, adminCheckError })
          isAdmin = !!adminData
        }

        // Redirect non-admin users to maintenance page
        if (!isAdmin) {
          console.log('[Middleware] Redirecting to maintenance page')
          return NextResponse.redirect(new URL('/maintenance', request.url))
        }
      }
    } catch (error) {
      // If platform_config table doesn't exist yet (first time setup), ignore the error
      console.log('[Middleware] Could not check maintenance mode:', error)
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/get-started', '/admin-login', '/op-login', '/maintenance', '/setup']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/api/setup')

  // Protected route patterns
  const isRealUserRoute = pathname.startsWith('/discover') || 
                          pathname.startsWith('/profile') || 
                          pathname.startsWith('/chat') || 
                          pathname.startsWith('/favorites') || 
                          pathname.startsWith('/me') || 
                          pathname.startsWith('/credits')
  
  const isOperatorRoute = pathname.startsWith('/operator')
  const isAdminRoute = pathname.startsWith('/admin')

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated, check role-based access
  if (user) {
    console.log('[Middleware] User authenticated, checking role-based access for path:', pathname)
    const role = await getUserRole(supabase, user.id)
    console.log('[Middleware] User role determined:', role)

    // Redirect authenticated users away from public auth pages
    if (isPublicRoute && pathname !== '/' && pathname !== '/setup') {
      console.log('[Middleware] User on public route, redirecting based on role')
      if (role === 'admin') {
        console.log('[Middleware] Redirecting admin to /admin/dashboard')
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else if (role === 'operator') {
        console.log('[Middleware] Redirecting operator to /operator/waiting')
        return NextResponse.redirect(new URL('/operator/waiting', request.url))
      } else if (role === 'real_user') {
        console.log('[Middleware] Redirecting real_user to /discover')
        return NextResponse.redirect(new URL('/discover', request.url))
      }
    }

    // Enforce role-based access control
    if (isRealUserRoute && role !== 'real_user') {
      console.log('[Middleware] Access denied: real_user route but role is', role)
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (isOperatorRoute && role !== 'operator') {
      console.log('[Middleware] Access denied: operator route but role is', role)
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (isAdminRoute && role !== 'admin') {
      console.log('[Middleware] Access denied: admin route but role is', role)
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  console.log('[Middleware] Request allowed, continuing')

  return response
}
