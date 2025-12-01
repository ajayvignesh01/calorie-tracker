import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Stethoscope, User } from 'lucide-react'
import Link from 'next/link'

export default function SignupSelectionPage() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-b from-muted to-background p-4'>
      <div className='w-full max-w-4xl'>
        <div className='mb-8 text-center'>
          <h1 className='mb-2 text-3xl font-bold'>Get Started</h1>
          <p className='text-muted-foreground'>Choose your account type to create an account</p>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          {/* Patient Signup Card */}
          <Card className='transition-all hover:shadow-lg'>
            <CardHeader className='text-center'>
              <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10'>
                <User className='h-8 w-8 text-primary' />
              </div>
              <CardTitle className='text-2xl'>Patient</CardTitle>
              <CardDescription>Track your nutrition and reach your health goals</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href='/signup/patient'>
                <Button className='w-full' size='lg'>
                  Sign up as Patient
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Doctor Signup Card */}
          <Card className='transition-all hover:shadow-lg'>
            <CardHeader className='text-center'>
              <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>
                <Stethoscope className='h-8 w-8 text-blue-600 dark:text-blue-400' />
              </div>
              <CardTitle className='text-2xl'>Doctor</CardTitle>
              <CardDescription>Monitor and manage your patients&apos; progress</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href='/signup/doctor'>
                <Button className='w-full' size='lg' variant='outline'>
                  Sign up as Doctor
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <p className='mt-8 text-center text-sm text-muted-foreground'>
          Already have an account?{' '}
          <Link href='/login' className='text-primary hover:underline'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
