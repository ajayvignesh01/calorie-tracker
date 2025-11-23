'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Stethoscope } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DoctorSignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/doctor/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 dark:from-blue-950 dark:to-background'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900'>
              <Stethoscope className='h-8 w-8 text-green-600 dark:text-green-400' />
            </div>
            <CardTitle className='text-2xl'>Account Created!</CardTitle>
            <CardDescription>
              Please check your email to verify your account, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className='w-full' onClick={() => router.push('/doctor/login')}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 dark:from-blue-950 dark:to-background'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>
            <Stethoscope className='h-8 w-8 text-blue-600 dark:text-blue-400' />
          </div>
          <CardTitle className='text-2xl'>Doctor Registration</CardTitle>
          <CardDescription>Create your doctor account to monitor patients</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className='space-y-4'>
            {error && (
              <div className='rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400'>
                {error}
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='fullName'>Full Name</Label>
              <Input
                id='fullName'
                type='text'
                placeholder='Dr. John Smith'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

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
                minLength={6}
              />
              <p className='text-xs text-muted-foreground'>Minimum 6 characters</p>
            </div>

            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Doctor Account'}
            </Button>
          </form>

          <p className='mt-6 text-center text-sm text-muted-foreground'>
            Already have an account?{' '}
            <a href='/doctor/login' className='text-primary hover:underline'>
              Sign in
            </a>
          </p>

          <p className='mt-2 text-center text-sm text-muted-foreground'>
            Not a doctor?{' '}
            <a href='/signup' className='text-primary hover:underline'>
              Patient signup
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
