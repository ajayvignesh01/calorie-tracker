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

  // Public routes that don't need auth (API routes handle their own auth)
  const publicRoutes = [
    '/login',
    '/login/patient',
    '/signup/patient',
    '/login/doctor',
    '/signup/doctor',
    '/error',
    '/api'
  ]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // If no user and trying to access protected route, redirect to appropriate login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    if (pathname.startsWith('/doctor')) {
      url.pathname = '/login/doctor'
    } else {
      url.pathname = '/login/patient'
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

    const url = request.nextUrl.clone()

    // If trying to access "/", redirect to the appropriate dashboard
    if (pathname === '/') {
      if (isDoctor) {
        url.pathname = '/doctor/dashboard'
        return NextResponse.redirect(url)
      } else {
        url.pathname = '/patient/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // If trying to access root "/patient" or "/doctor", redirect to the appropriate dashboard
    if (pathname === '/doctor') {
      if (isDoctor) {
        url.pathname = '/doctor/dashboard'
        return NextResponse.redirect(url)
      } else {
        url.pathname = '/patient/dashboard'
        return NextResponse.redirect(url)
      }
    }
    if (pathname === '/patient') {
      if (isDoctor) {
        url.pathname = '/patient/dashboard'
        return NextResponse.redirect(url)
      } else {
        url.pathname = '/doctor/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // If logged in and trying to access different user routes, redirect to the appropriate dashboard
    if (isDoctor) {
      // If trying to access a patient route as a doctor, redirect to the doctor dashboard
      if (!isDoctorRoute && !isPublicRoute) {
        url.pathname = '/doctor/dashboard'
        return NextResponse.redirect(url)
      }
    } else {
      // If trying to access a doctor route as a patient, redirect to the patient dashboard
      if (isDoctorRoute && !isPublicRoute) {
        url.pathname = '/patient/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // If logged in and trying to access /login or /signup, redirect to the appropriate dashboard
    if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
      const url = request.nextUrl.clone()
      if (isDoctor) {
        url.pathname = '/doctor/dashboard'
        return NextResponse.redirect(url)
      } else {
        url.pathname = '/patient/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
