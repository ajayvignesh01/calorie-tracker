'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  LogOut,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface Patient {
  id: string
  patient_id: string
  status: string
  profile: {
    full_name: string | null
    email?: string
    daily_calorie_target: number | null
    goal: string | null
  } | null
  todayCalories?: number
}

export default function DoctorDashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState<{ id: string; email: string; full_name: string | null } | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [addingPatient, setAddingPatient] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const fetchPatients = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/doctor/login')
      return
    }

    // Verify doctor role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'doctor') {
      router.push('/doctor/login')
      return
    }

    // Fetch patients with their profiles
    const { data: doctorPatients } = await supabase
      .from('doctor_patients')
      .select('id, patient_id, status')
      .eq('doctor_id', user.id)
      .eq('status', 'active')

    if (doctorPatients && doctorPatients.length > 0) {
      const patientIds = doctorPatients.map((dp) => dp.patient_id)

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, daily_calorie_target, goal')
        .in('id', patientIds)

      // Get today's calories for each patient
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: todayEntries } = await supabase
        .from('food_entries')
        .select('user_id, calories')
        .in('user_id', patientIds)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())

      const caloriesByPatient: Record<string, number> = {}
      todayEntries?.forEach((entry) => {
        caloriesByPatient[entry.user_id] = (caloriesByPatient[entry.user_id] || 0) + entry.calories
      })

      const patientsWithProfiles = doctorPatients.map((dp) => ({
        ...dp,
        profile: profiles?.find((p) => p.id === dp.patient_id) || null,
        todayCalories: caloriesByPatient[dp.patient_id] || 0
      }))

      setPatients(patientsWithProfiles)
    } else {
      setPatients([])
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const handleSearch = async () => {
    if (!searchEmail.trim()) return

    setSearching(true)
    setSearchError(null)
    setSearchResult(null)

    // Search for user by email using auth admin or a lookup
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('role', 'user')

    if (error) {
      setSearchError('Error searching for patient')
      setSearching(false)
      return
    }

    // We need to search by email - let's use a different approach
    // For now, we'll search in auth.users via the API
    const { data: authData } = await supabase.auth.admin?.listUsers?.() || { data: null }

    // Fallback: use RPC or direct query if admin API not available
    // For this demo, we'll match by checking if the user exists
    const {
      data: { user: searchedUser }
    } = await supabase.auth.getUser()

    // Simple approach: try to find user profile and match
    // In production, you'd have an API endpoint for this
    setSearchError('Enter the patient\'s user ID directly, or ask them for their account email')
    setSearching(false)
  }

  const handleSearchById = async () => {
    if (!searchEmail.trim()) return

    setSearching(true)
    setSearchError(null)
    setSearchResult(null)

    try {
      const response = await fetch('/api/doctor/search-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: searchEmail.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        setSearchResult({ id: data.id, email: '', full_name: data.full_name })
      } else {
        setSearchError(data.error || 'No patient found with that ID')
      }
    } catch {
      setSearchError('Failed to search for patient')
    }

    setSearching(false)
  }

  const handleAddPatient = async () => {
    if (!searchResult) return

    setAddingPatient(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) return

    // Check if already added
    const { data: existing } = await supabase
      .from('doctor_patients')
      .select('id')
      .eq('doctor_id', user.id)
      .eq('patient_id', searchResult.id)
      .single()

    if (existing) {
      setSearchError('This patient is already in your list')
      setAddingPatient(false)
      return
    }

    const { error } = await supabase.from('doctor_patients').insert({
      doctor_id: user.id,
      patient_id: searchResult.id,
      status: 'active'
    })

    if (error) {
      setSearchError('Failed to add patient')
    } else {
      setDialogOpen(false)
      setSearchEmail('')
      setSearchResult(null)
      fetchPatients()
    }

    setAddingPatient(false)
  }

  const handleRemovePatient = async (patientId: string) => {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase
      .from('doctor_patients')
      .update({ status: 'removed' })
      .eq('doctor_id', user.id)
      .eq('patient_id', patientId)

    fetchPatients()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/doctor/login')
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 dark:from-blue-950 dark:to-background'>
        <div className='mx-auto max-w-6xl space-y-6'>
          <Skeleton className='h-10 w-64' />
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <Skeleton className='h-48' />
            <Skeleton className='h-48' />
            <Skeleton className='h-48' />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background'>
      {/* Header */}
      <header className='border-b bg-white/80 backdrop-blur dark:bg-background/80'>
        <div className='mx-auto flex max-w-6xl items-center justify-between p-4'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>
              <Stethoscope className='h-5 w-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <h1 className='text-xl font-semibold'>Doctor Dashboard</h1>
              <p className='text-sm text-muted-foreground'>Manage your patients</p>
            </div>
          </div>
          <Button variant='outline' onClick={handleSignOut}>
            <LogOut className='mr-2 h-4 w-4' />
            Sign Out
          </Button>
        </div>
      </header>

      <main className='mx-auto max-w-6xl p-6'>
        {/* Stats */}
        <div className='mb-6 grid gap-4 md:grid-cols-3'>
          <Card>
            <CardContent className='flex items-center gap-4 p-6'>
              <div className='flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>
                <Users className='h-6 w-6 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Total Patients</p>
                <p className='text-2xl font-bold'>{patients.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center gap-4 p-6'>
              <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900'>
                <Activity className='h-6 w-6 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Active Today</p>
                <p className='text-2xl font-bold'>
                  {patients.filter((p) => (p.todayCalories || 0) > 0).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center gap-4 p-6'>
              <div className='flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900'>
                <TrendingUp className='h-6 w-6 text-orange-600 dark:text-orange-400' />
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>On Track</p>
                <p className='text-2xl font-bold'>
                  {
                    patients.filter(
                      (p) =>
                        p.profile?.daily_calorie_target &&
                        (p.todayCalories || 0) <= p.profile.daily_calorie_target
                    ).length
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patients Section */}
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold'>Your Patients</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className='mr-2 h-4 w-4' />
                Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Patient</DialogTitle>
                <DialogDescription>
                  Enter the patient&apos;s ID to add them to your dashboard
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='patientId'>Patient ID</Label>
                  <div className='flex gap-2'>
                    <Input
                      id='patientId'
                      placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                    />
                    <Button onClick={handleSearchById} disabled={searching}>
                      <Search className='h-4 w-4' />
                    </Button>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Ask your patient for their ID from their profile page
                  </p>
                </div>

                {searchError && (
                  <p className='text-sm text-red-500'>{searchError}</p>
                )}

                {searchResult && (
                  <Card>
                    <CardContent className='flex items-center justify-between p-4'>
                      <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                          <User className='h-5 w-5' />
                        </div>
                        <div>
                          <p className='font-medium'>{searchResult.full_name || 'Unknown'}</p>
                          <p className='text-sm text-muted-foreground'>Patient</p>
                        </div>
                      </div>
                      <Button onClick={handleAddPatient} disabled={addingPatient}>
                        {addingPatient ? 'Adding...' : 'Add'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {patients.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <Users className='mb-4 h-12 w-12 text-muted-foreground' />
              <p className='text-lg font-medium'>No patients yet</p>
              <p className='text-muted-foreground'>Add your first patient to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {patients.map((patient) => (
              <Card key={patient.id} className='overflow-hidden'>
                <CardHeader className='pb-2'>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                        <User className='h-5 w-5' />
                      </div>
                      <div>
                        <CardTitle className='text-base'>
                          {patient.profile?.full_name || 'Unknown Patient'}
                        </CardTitle>
                        <CardDescription className='flex items-center gap-1'>
                          {patient.profile?.goal === 'lose' && (
                            <>
                              <TrendingDown className='h-3 w-3' /> Losing weight
                            </>
                          )}
                          {patient.profile?.goal === 'gain' && (
                            <>
                              <TrendingUp className='h-3 w-3' /> Gaining weight
                            </>
                          )}
                          {patient.profile?.goal === 'maintain' && 'Maintaining'}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='text-muted-foreground hover:text-red-500'
                      onClick={() => handleRemovePatient(patient.patient_id)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    <div>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-muted-foreground'>Today&apos;s Calories</span>
                        <span className='font-medium'>
                          {patient.todayCalories || 0} / {patient.profile?.daily_calorie_target || '—'}
                        </span>
                      </div>
                      {patient.profile?.daily_calorie_target && (
                        <div className='mt-1 h-2 rounded-full bg-muted'>
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (patient.todayCalories || 0) > patient.profile.daily_calorie_target
                                ? 'bg-red-500'
                                : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                ((patient.todayCalories || 0) / patient.profile.daily_calorie_target) * 100,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <Button variant='outline' className='w-full' asChild>
                      <Link href={`/doctor/patient/${patient.patient_id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
