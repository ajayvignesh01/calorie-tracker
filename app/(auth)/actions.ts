'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getURL } from '@/lib/utils'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('error logging in', error)
    redirect('/error')
  }

  // Check if user has completed onboarding
  if (authData.user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('id', authData.user.id)
      .single()

    if (!profile || !profile.onboarding_completed) {
      revalidatePath('/', 'layout')
      redirect('/patient/onboarding')
    }
  }

  revalidatePath('/', 'layout')
  redirect('/patient/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('error signing up', error)
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/patient/onboarding')
}

export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getURL('/api/auth/callback')
    }
  })

  if (data.url) {
    redirect(data.url) // use the redirect API for your server framework
  }
}

export async function signInWithGithub() {
  const supabase = await createClient()

  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: getURL('/api/auth/callback')
    }
  })

  if (data.url) {
    redirect(data.url) // use the redirect API for your server framework
  }
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    redirect('/error')
  }
  redirect('/login')
}
