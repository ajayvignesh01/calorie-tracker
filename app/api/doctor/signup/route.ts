import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createAdminClient()

  const { email, password, fullName } = await request.json()

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  // Sign up the user using admin client
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  // Delete any existing profile first, then insert fresh
  await supabase.from('user_profiles').delete().eq('id', authData.user.id)

  // Create doctor profile using admin client (bypasses RLS)
  const { error: profileError } = await supabase.from('user_profiles').insert({
    id: authData.user.id,
    full_name: fullName,
    role: 'doctor',
    onboarding_completed: true
  })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    return NextResponse.json({ error: 'Account created but failed to set up profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
