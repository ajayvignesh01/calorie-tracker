'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  ArrowLeft,
  Calendar,
  Flame,
  Ruler,
  Scale,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  User
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface PatientProfile {
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
}

interface FoodEntry {
  id: string
  food_name: string
  quantity: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  created_at: string
}

interface DayData {
  date: Date
  entries: FoodEntry[]
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
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

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = params.id as string

  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Get the first and last day of the current month
  const monthStart = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }, [currentDate])

  const monthEnd = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  }, [currentDate])

  const fetchData = useCallback(async () => {
    setLoading(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login/doctor')
      return
    }

    // Verify doctor has access to this patient
    const { data: relationship } = await supabase
      .from('doctor_patients')
      .select('id')
      .eq('doctor_id', user.id)
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .single()

    if (!relationship) {
      router.push('/doctor/dashboard')
      return
    }

    // Fetch patient profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', patientId)
      .single()

    if (profileData) {
      setProfile(profileData)
    }

    // Fetch food entries for the current month
    const { data: entries } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', patientId)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', new Date(monthEnd.getTime() + 86400000).toISOString())
      .order('created_at', { ascending: true })

    if (entries) {
      setFoodEntries(entries)
    }

    setLoading(false)
  }, [supabase, router, patientId, monthStart, monthEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const grouped: Record<string, FoodEntry[]> = {}
    foodEntries.forEach((entry) => {
      const dateKey = new Date(entry.created_at).toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(entry)
    })
    return grouped
  }, [foodEntries])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days: (DayData | null)[] = []
    const firstDayOfWeek = monthStart.getDay()

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateKey = date.toDateString()
      const entries = entriesByDay[dateKey] || []
      const totals = entries.reduce(
        (acc, entry) => ({
          calories: acc.calories + entry.calories,
          protein: acc.protein + Number(entry.protein),
          carbs: acc.carbs + Number(entry.carbs),
          fat: acc.fat + Number(entry.fat)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
      days.push({ date, entries, totals })
    }

    return days
  }, [currentDate, monthStart, monthEnd, entriesByDay])

  // Calculate weekly averages
  const weeklyStats = useMemo(() => {
    const last7Days = calendarDays
      .filter((d): d is DayData => d !== null && d.entries.length > 0)
      .slice(-7)

    if (last7Days.length === 0) return null

    const avgCalories = last7Days.reduce((sum, d) => sum + d.totals.calories, 0) / last7Days.length
    const avgProtein = last7Days.reduce((sum, d) => sum + d.totals.protein, 0) / last7Days.length
    const avgCarbs = last7Days.reduce((sum, d) => sum + d.totals.carbs, 0) / last7Days.length
    const avgFat = last7Days.reduce((sum, d) => sum + d.totals.fat, 0) / last7Days.length

    return { avgCalories, avgProtein, avgCarbs, avgFat, daysTracked: last7Days.length }
  }, [calendarDays])

  const calculateAge = (dob: string) => {
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString()

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-b from-muted to-background p-6 dark:from-blue-950 dark:to-background'>
        <div className='mx-auto max-w-6xl space-y-6'>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-96' />
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className='min-h-screen bg-gradient-to-b from-muted to-background dark:from-blue-950 dark:to-background'>
      {/* Header */}
      <header className='border-b bg-white/80 backdrop-blur dark:bg-background/80'>
        <div className='mx-auto flex max-w-6xl items-center gap-4 p-4'>
          <Button variant='ghost' size='icon' asChild>
            <Link href='/doctor/dashboard'>
              <ArrowLeft className='h-5 w-5' />
            </Link>
          </Button>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>
              <Stethoscope className='h-5 w-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <h1 className='text-xl font-semibold'>Patient Details</h1>
              <p className='text-sm text-muted-foreground'>
                {profile.full_name || 'Unknown Patient'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-6xl space-y-6 p-6'>
        {/* Patient Info */}
        <div className='grid gap-4 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <User className='h-5 w-5' />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Name</span>
                <span className='font-medium'>{profile.full_name || 'Not set'}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Calendar className='h-4 w-4' />
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
                  <Ruler className='h-4 w-4' />
                  Height
                </span>
                <span className='font-medium'>
                  {profile.height_cm ? `${profile.height_cm} cm` : 'Not set'}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  <Scale className='h-4 w-4' />
                  Weight
                </span>
                <span className='font-medium'>
                  {profile.weight_kg ? `${profile.weight_kg} kg` : 'Not set'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Target className='h-5 w-5' />
                Goals & Targets
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Activity Level</span>
                <span className='font-medium'>
                  {profile.activity_level ? activityLabels[profile.activity_level] : 'Not set'}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='flex items-center gap-2 text-muted-foreground'>
                  {profile.goal === 'lose' && <TrendingDown className='h-4 w-4' />}
                  {profile.goal === 'gain' && <TrendingUp className='h-4 w-4' />}
                  {profile.goal === 'maintain' && <Target className='h-4 w-4' />}
                  Goal
                </span>
                <span className='font-medium'>
                  {profile.goal ? goalLabels[profile.goal] : 'Not set'}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Daily Calories</span>
                <span className='font-medium'>{profile.daily_calorie_target || '—'} kcal</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground'>Daily Protein</span>
                <span className='font-medium'>{profile.daily_protein_target || '—'}g</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Averages */}
        {weeklyStats && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='h-5 w-5' />
                Recent Averages
              </CardTitle>
              <CardDescription>
                Based on last {weeklyStats.daysTracked} days with logged entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <div className='rounded-lg bg-orange-500/10 p-4 text-center'>
                  <p className='text-sm text-muted-foreground'>Avg Calories</p>
                  <p className='text-2xl font-bold text-orange-500'>
                    {Math.round(weeklyStats.avgCalories)}
                  </p>
                  {profile.daily_calorie_target && (
                    <p className='text-xs text-muted-foreground'>
                      Target: {profile.daily_calorie_target}
                    </p>
                  )}
                </div>
                <div className='rounded-lg bg-blue-500/10 p-4 text-center'>
                  <p className='text-sm text-muted-foreground'>Avg Protein</p>
                  <p className='text-2xl font-bold text-blue-500'>
                    {Math.round(weeklyStats.avgProtein)}g
                  </p>
                </div>
                <div className='rounded-lg bg-green-500/10 p-4 text-center'>
                  <p className='text-sm text-muted-foreground'>Avg Carbs</p>
                  <p className='text-2xl font-bold text-green-500'>
                    {Math.round(weeklyStats.avgCarbs)}g
                  </p>
                </div>
                <div className='rounded-lg bg-yellow-500/10 p-4 text-center'>
                  <p className='text-sm text-muted-foreground'>Avg Fat</p>
                  <p className='text-2xl font-bold text-yellow-500'>
                    {Math.round(weeklyStats.avgFat)}g
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <Button variant='ghost' onClick={goToPreviousMonth}>
                ←
              </Button>
              <CardTitle>{monthYear}</CardTitle>
              <Button variant='ghost' onClick={goToNextMonth}>
                →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-7 gap-1'>
              {weekDays.map((day) => (
                <div
                  key={day}
                  className='p-2 text-center text-sm font-medium text-muted-foreground'
                >
                  {day}
                </div>
              ))}

              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => day && day.entries.length > 0 && setSelectedDay(day)}
                  className={`min-h-20 rounded-lg border p-2 transition-colors ${
                    day
                      ? day.entries.length > 0
                        ? 'cursor-pointer hover:border-primary/50 hover:bg-accent/50'
                        : 'bg-muted/30'
                      : 'bg-transparent'
                  } ${day && isToday(day.date) ? 'border-primary' : 'border-border'}`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-sm font-medium ${isToday(day.date) ? 'text-primary' : ''}`}
                      >
                        {day.date.getDate()}
                      </div>
                      {day.entries.length > 0 && (
                        <div className='mt-1 space-y-0.5'>
                          <div
                            className={`text-xs font-semibold ${
                              profile.daily_calorie_target &&
                              day.totals.calories > profile.daily_calorie_target
                                ? 'text-red-500'
                                : 'text-green-500'
                            }`}
                          >
                            {day.totals.calories} cal
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        {selectedDay && (
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>
                    {selectedDay.date.toLocaleDateString('default', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardTitle>
                  <CardDescription>
                    {selectedDay.entries.length} food{selectedDay.entries.length !== 1 ? 's' : ''}{' '}
                    logged
                  </CardDescription>
                </div>
                <Button variant='ghost' size='sm' onClick={() => setSelectedDay(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Day totals */}
              <div className='grid grid-cols-4 gap-2'>
                <div className='rounded-lg bg-orange-500/10 p-2 text-center'>
                  <p className='text-xs text-orange-500'>Calories</p>
                  <p className='font-bold text-orange-500'>{selectedDay.totals.calories}</p>
                </div>
                <div className='rounded-lg bg-blue-500/10 p-2 text-center'>
                  <p className='text-xs text-blue-500'>Protein</p>
                  <p className='font-bold text-blue-500'>
                    {selectedDay.totals.protein.toFixed(1)}g
                  </p>
                </div>
                <div className='rounded-lg bg-green-500/10 p-2 text-center'>
                  <p className='text-xs text-green-500'>Carbs</p>
                  <p className='font-bold text-green-500'>{selectedDay.totals.carbs.toFixed(1)}g</p>
                </div>
                <div className='rounded-lg bg-yellow-500/10 p-2 text-center'>
                  <p className='text-xs text-yellow-500'>Fat</p>
                  <p className='font-bold text-yellow-500'>{selectedDay.totals.fat.toFixed(1)}g</p>
                </div>
              </div>

              {/* Food entries */}
              <div className='space-y-2'>
                {selectedDay.entries.map((entry) => (
                  <div key={entry.id} className='rounded-lg bg-muted p-3'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <p className='font-medium'>{entry.food_name}</p>
                        {entry.quantity && (
                          <p className='text-sm text-muted-foreground'>{entry.quantity}</p>
                        )}
                      </div>
                      <p className='font-semibold text-orange-500'>{entry.calories} cal</p>
                    </div>
                    <div className='mt-2 flex gap-4 text-sm'>
                      <span className='text-blue-500'>P: {entry.protein}g</span>
                      <span className='text-green-500'>C: {entry.carbs}g</span>
                      <span className='text-yellow-500'>F: {entry.fat}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
