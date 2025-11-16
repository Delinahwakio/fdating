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

  // Skip role checking for API routes and static assets
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return response
  }

  // Check maintenance mode (except for admins, maintenance page, and setup)
  if (pathname !== '/maintenance' && pathname !== '/setup' && !pathname.startsWith('/admin') && !pathname.startsWith('/api/setup')) {
    try {
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
    } catch (error) {
      // If platform_config table doesn't exist yet (first time setup), ignore the error
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/get-started', '/login', '/admin-login', '/op-login', '/maintenance', '/setup']
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
    // Try to get cached role from cookie first
    const cachedRole = request.cookies.get('user_role')?.value as UserRole | undefined
    let role: UserRole | null = null
    
    // Always verify role on protected routes for security
    // But use cache for public routes to reduce database queries
    const isProtectedRoute = isRealUserRoute || isOperatorRoute || isAdminRoute
    const needsRoleCheck = isProtectedRoute || 
                          !cachedRole || 
                          (isPublicRoute && pathname !== '/' && pathname !== '/setup')

    if (needsRoleCheck) {
      role = await getUserRole(supabase, user.id)
      
      // Cache the role in a cookie (expires in 1 hour)
      if (role) {
        response.cookies.set('user_role', role, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60, // 1 hour
          path: '/',
        })
      } else {
        // Clear role cookie if no role found
        response.cookies.delete('user_role')
      }
    } else {
      // Use cached role for public routes
      role = cachedRole || null
    }

    // Redirect authenticated users away from public auth pages
    if (isPublicRoute && pathname !== '/' && pathname !== '/setup') {
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
