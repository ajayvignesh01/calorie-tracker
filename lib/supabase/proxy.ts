import { Database } from '@/lib/supabase/database.types'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request
          })
          cookiesToSet.forEach(({ name, value }) => supabaseResponse.cookies.set(name, value))
        }
      }
    }
  )

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const pathname = request.nextUrl.pathname

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/signup', '/doctor/login', '/doctor/signup', '/error', '/api/auth']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // If no user and trying to access protected route, redirect to appropriate login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    if (pathname.startsWith('/doctor')) {
      url.pathname = '/doctor/login'
    } else {
      url.pathname = '/login'
    }
    return NextResponse.redirect(url)
  }

  // If user is logged in, check their role and redirect accordingly
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.sub)
      .single()

    const isDoctor = profile?.role === 'doctor'
    const isDoctorRoute = pathname.startsWith('/doctor')

    // Doctor trying to access user routes -> redirect to doctor dashboard
    if (isDoctor && !isDoctorRoute && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/doctor/dashboard'
      return NextResponse.redirect(url)
    }

    // User trying to access doctor routes -> redirect to user home
    if (!isDoctor && isDoctorRoute && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Logged in doctor trying to access doctor login -> redirect to dashboard
    if (isDoctor && pathname === '/doctor/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/doctor/dashboard'
      return NextResponse.redirect(url)
    }

    // Logged in user trying to access user login -> redirect to home
    if (!isDoctor && pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
