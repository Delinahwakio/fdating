import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type UserRole = 'real_user' | 'operator' | 'admin' | null

async function getUserRole(supabase: any, userId: string): Promise<UserRole> {
  // Check if user is an admin
  const { data: adminData } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (adminData) {
    return 'admin'
  }

  // Check if user is an operator
  const { data: operatorData } = await supabase
    .from('operators')
    .select('id, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (operatorData) {
    // Only return operator role if the account is active
    if (!operatorData.is_active) {
      return null // Deactivated operators cannot access the system
    }
    return 'operator'
  }

  // Check if user is a real user
  const { data: realUserData } = await supabase
    .from('real_users')
    .select('id, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (realUserData) {
    // Only return real_user role if the account is active
    if (!realUserData.is_active) {
      return null // Deactivated users cannot access the system
    }
    return 'real_user'
  }

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

  // Check maintenance mode (except for admins and maintenance page itself)
  if (pathname !== '/maintenance' && !pathname.startsWith('/admin')) {
    const { data: maintenanceConfig } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()

    const isMaintenanceMode = maintenanceConfig?.value === 'true' || maintenanceConfig?.value === true

    if (isMaintenanceMode) {
      // Check if user is admin
      let isAdmin = false
      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        isAdmin = !!adminData
      }

      // Redirect non-admin users to maintenance page
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/maintenance', request.url))
      }
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/get-started', '/admin-login', '/op-login', '/maintenance']
  const isPublicRoute = publicRoutes.includes(pathname)

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
    const role = await getUserRole(supabase, user.id)

    // Redirect authenticated users away from public auth pages
    if (isPublicRoute && pathname !== '/') {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      } else if (role === 'operator') {
        return NextResponse.redirect(new URL('/operator/waiting', request.url))
      } else if (role === 'real_user') {
        return NextResponse.redirect(new URL('/discover', request.url))
      }
    }

    // Enforce role-based access control
    if (isRealUserRoute && role !== 'real_user') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (isOperatorRoute && role !== 'operator') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}
