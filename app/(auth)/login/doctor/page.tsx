'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Stethoscope } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DoctorLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    if (authData.user) {
      // Check if user is a doctor
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (!profile || profile.role !== 'doctor') {
        await supabase.auth.signOut()
        setError('Access denied. This portal is for doctors only.')
        setLoading(false)
        return
      }

      router.push('/doctor/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 dark:from-blue-950 dark:to-background'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>
            <Stethoscope className='h-8 w-8 text-blue-600 dark:text-blue-400' />
          </div>
          <CardTitle className='text-2xl'>Doctor Portal</CardTitle>
          <CardDescription>Sign in to access your patient dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className='space-y-4'>
            {error && (
              <div className='rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400'>
                {error}
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='doctor@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className='mt-6 text-center text-sm text-muted-foreground'>
            Don&apos;t have an account?{' '}
            <a href='/signup/doctor' className='text-primary hover:underline'>
              Register as a doctor
            </a>
          </p>

          <p className='mt-2 text-center text-sm text-muted-foreground'>
            Not a doctor?{' '}
            <a href='/login/patient' className='text-primary hover:underline'>
              Go to patient login
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
