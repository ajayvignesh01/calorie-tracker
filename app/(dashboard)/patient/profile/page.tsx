'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  Calendar,
  Check,
  Copy,
  Flame,
  Pencil,
  Ruler,
  Scale,
  Share2,
  Target,
  TrendingDown,
  TrendingUp,
  User
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserProfile {
  id: string
  full_name: string | null
  date_of_birth: string | null
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: string | null
  goal: string | null
  daily_calorie_target: number | null
  daily_protein_target: number | null
  daily_carbs_target: number | null
  daily_fat_target: number | null
  onboarding_completed: boolean
}

interface TodayStats {
  calories: number
  protein: number
  carbs: number
  fat: number
  entryCount: number
}

const activityLabels: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  extra: 'Extra Active'
}

const goalLabels: Record<string, string> = {
  lose: 'Lose Weight',
  maintain: 'Maintain Weight',
  gain: 'Gain Weight'
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login/patient')
        return
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        if (!profileData.onboarding_completed) {
          router.push('/patient/onboarding')
          return
        }
      } else {
        router.push('/patient/onboarding')
        return
      }

      // Fetch today's food entries
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: entries } = await supabase
        .from('food_entries')
        .select('calories, protein, carbs, fat')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())

      if (entries) {
        setTodayStats({
          calories: entries.reduce((sum, e) => sum + e.calories, 0),
          protein: entries.reduce((sum, e) => sum + Number(e.protein), 0),
          carbs: entries.reduce((sum, e) => sum + Number(e.carbs), 0),
          fat: entries.reduce((sum, e) => sum + Number(e.fat), 0),
          entryCount: entries.length
        })
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  const calculateAge = (dob: string) => {
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)
  }

  const getProgressColor = (current: number, target: number) => {
    const percentage = (current / target) * 100
    if (percentage < 80) return 'bg-blue-500'
    if (percentage <= 100) return 'bg-green-500'
    return 'bg-red-500'
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  if (loading) {
    return (
      <div className='flex flex-1 flex-col gap-4 p-4'>
        <div className='mx-auto w-full max-w-4xl space-y-4'>
          <Skeleton className='h-8 w-48' />
          <div className='grid gap-4 md:grid-cols-2'>
            <Skeleton className='h-64' />
            <Skeleton className='h-64' />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className='flex flex-1 flex-col gap-4 p-4'>
      <div className='mx-auto w-full max-w-4xl space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-semibold tracking-tight'>My Profile</h2>
            <p className='text-muted-foreground'>View and manage your profile settings</p>
          </div>
          <Button variant='outline' asChild>
            <Link href='/patient/onboarding'>
              <Pencil className='mr-2 size-4' />
              Edit Profile
            </Link>
          </Button>
        </div>

        {/* Today's Progress */}
        {todayStats && profile.daily_calorie_target && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Target className='size-5' />
                Today&apos;s Progress
              </CardTitle>
              <CardDescription>
                {todayStats.entryCount} food{todayStats.entryCount !== 1 ? 's' : ''} logged today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {/* Calories */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Calories</span>
                    <span className='font-medium'>
                      {todayStats.calories} / {profile.daily_calorie_target}
                    </span>
                  </div>
                  <div className='h-2 rounded-full bg-muted'>
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(todayStats.calories, profile.daily_calorie_target)}`}
                      style={{
                        width: `${getProgressPercentage(todayStats.calories, profile.daily_calorie_target)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Protein */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Protein</span>
                    <span className='font-medium'>
                      {todayStats.protein.toFixed(0)}g / {profile.daily_protein_target}g
                    </span>
                  </div>
                  <div className='h-2 rounded-full bg-muted'>
                    <div
                      className='h-2 rounded-full bg-blue-500 transition-all'
                      style={{
                        width: `${getProgressPercentage(todayStats.protein, profile.daily_protein_target || 1)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Carbs</span>
                    <span className='font-medium'>
                      {todayStats.carbs.toFixed(0)}g / {profile.daily_carbs_target}g
                    </span>
                  </div>
                  <div className='h-2 rounded-full bg-muted'>
                    <div
                      className='h-2 rounded-full bg-green-500 transition-all'
                      style={{
                        width: `${getProgressPercentage(todayStats.carbs, profile.daily_carbs_target || 1)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Fat */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Fat</span>
                    <span className='font-medium'>
                      {todayStats.fat.toFixed(0)}g / {profile.daily_fat_target}g
                    </span>
                  </div>
                  <div className='h-2 rounded-full bg-muted'>
                    <div
                      className='h-2 rounded-full bg-yellow-500 transition-all'
                      style={{
                        width: `${getProgressPercentage(todayStats.fat, profile.daily_fat_target || 1)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className='grid gap-4 md:grid-cols-2'>
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <User className='size-5' />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Name</span>
                <span className='font-medium'>{profile.full_name || 'Not set'}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Calendar className='size-4' />
                  Age
                </span>
                <span className='font-medium'>
                  {profile.date_of_birth
                    ? `${calculateAge(profile.date_of_birth)} years`
                    : 'Not set'}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Gender</span>
                <span className='font-medium capitalize'>{profile.gender || 'Not set'}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Ruler className='size-4' />
                  Height
                </span>
                <span className='font-medium'>
                  {profile.height_cm ? `${profile.height_cm} cm` : 'Not set'}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Scale className='size-4' />
                  Weight
                </span>
                <span className='font-medium'>
                  {profile.weight_kg ? `${profile.weight_kg} kg` : 'Not set'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Goals & Activity */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='size-5' />
                Goals & Activity
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Activity Level</span>
                <span className='font-medium'>
                  {profile.activity_level ? activityLabels[profile.activity_level] : 'Not set'}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  {profile.goal === 'lose' && <TrendingDown className='size-4' />}
                  {profile.goal === 'gain' && <TrendingUp className='size-4' />}
                  {profile.goal === 'maintain' && <Target className='size-4' />}
                  Goal
                </span>
                <span className='font-medium'>
                  {profile.goal ? goalLabels[profile.goal] : 'Not set'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Targets */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Flame className='size-5' />
              Daily Targets
            </CardTitle>
            <CardDescription>Your personalized daily nutrition targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='rounded-lg bg-orange-500/10 p-4 text-center'>
                <p className='text-sm text-muted-foreground'>Calories</p>
                <p className='text-3xl font-bold text-orange-500'>
                  {profile.daily_calorie_target || '—'}
                </p>
                <p className='text-xs text-muted-foreground'>kcal/day</p>
              </div>
              <div className='rounded-lg bg-blue-500/10 p-4 text-center'>
                <p className='text-sm text-muted-foreground'>Protein</p>
                <p className='text-3xl font-bold text-blue-500'>
                  {profile.daily_protein_target || '—'}
                </p>
                <p className='text-xs text-muted-foreground'>grams/day</p>
              </div>
              <div className='rounded-lg bg-green-500/10 p-4 text-center'>
                <p className='text-sm text-muted-foreground'>Carbs</p>
                <p className='text-3xl font-bold text-green-500'>
                  {profile.daily_carbs_target || '—'}
                </p>
                <p className='text-xs text-muted-foreground'>grams/day</p>
              </div>
              <div className='rounded-lg bg-yellow-500/10 p-4 text-center'>
                <p className='text-sm text-muted-foreground'>Fat</p>
                <p className='text-3xl font-bold text-yellow-500'>
                  {profile.daily_fat_target || '—'}
                </p>
                <p className='text-xs text-muted-foreground'>grams/day</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share with Doctor */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Share2 className='size-5' />
              Share with Doctor
            </CardTitle>
            <CardDescription>
              Give this ID to your doctor so they can monitor your progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              <code className='flex-1 rounded-lg bg-muted px-4 py-3 font-mono text-sm'>
                {profile.id}
              </code>
              <Button
                variant='outline'
                size='icon'
                onClick={() => {
                  navigator.clipboard.writeText(profile.id)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? <Check className='size-4 text-green-500' /> : <Copy className='size-4' />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
