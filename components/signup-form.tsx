import { signup } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import PlaceholderImage from '@/public/placeholder.svg'
import Image from 'next/image'
import Link from 'next/link'
import { OAuthButtons } from './oauth-buttons'

export function SignupForm({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className='overflow-hidden p-0'>
        <CardContent className='grid p-0 md:grid-cols-2'>
          <form className='p-6 md:p-8'>
            <FieldGroup>
              <div className='flex flex-col items-center gap-2 text-center'>
                <h1 className='text-2xl font-bold'>Create your account</h1>
                <p className='text-sm text-balance text-muted-foreground'>
                  Enter your email below to create your account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor='email'>Email</FieldLabel>
                <Input id='email' name='email' type='email' placeholder='m@example.com' required />
                <FieldDescription>
                  We&apos;ll use this to contact you. We will not share your email with anyone else.
                </FieldDescription>
              </Field>
              <Field>
                <Field className='grid grid-cols-2 gap-4'>
                  <Field>
                    <FieldLabel htmlFor='password'>Password</FieldLabel>
                    <Input id='password' name='password' type='password' required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor='confirm-password'>Confirm Password</FieldLabel>
                    <Input id='confirm-password' name='confirm-password' type='password' required />
                  </Field>
                </Field>
                <FieldDescription>Must be at least 8 characters long.</FieldDescription>
              </Field>
              <Field>
                <Button formAction={signup}>Create Account</Button>
              </Field>
              <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card'>
                Or continue with
              </FieldSeparator>
              <Field className='grid grid-cols-2 gap-4'>
                <OAuthButtons />
              </Field>
              <FieldDescription className='text-center'>
                Already have an account? <Link href='/login'>Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className='relative hidden bg-muted md:block'>
            <Image
              src={PlaceholderImage}
              alt='Image'
              className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale'
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className='px-6 text-center'>
        By clicking continue, you agree to our <a href='#'>Terms of Service</a> and{' '}
        <a href='#'>Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
