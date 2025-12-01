'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type FormData = {
  fullName: string
  dateOfBirth: string
  gender: string
  heightCm: string
  weightKg: string
  activityLevel: string
  goal: string
}

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'extra', label: 'Extra Active', description: 'Very hard exercise & physical job' }
]

const goals = [
  { value: 'lose', label: 'Lose Weight', description: 'Caloric deficit to lose fat' },
  { value: 'maintain', label: 'Maintain Weight', description: 'Keep your current weight' },
  { value: 'gain', label: 'Gain Weight', description: 'Caloric surplus to build muscle' }
]

function calculateTargets(data: FormData) {
  const weight = parseFloat(data.weightKg)
  const height = parseFloat(data.heightCm)
  const age = data.dateOfBirth
    ? Math.floor((Date.now() - new Date(data.dateOfBirth).getTime()) / 31557600000)
    : 25

  // Mifflin-St Jeor Equation for BMR
  let bmr: number
  if (data.gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161
  }

  // Activity multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extra: 1.9
  }

  const tdee = bmr * (activityMultipliers[data.activityLevel] || 1.55)

  // Goal adjustment
  let calories: number
  if (data.goal === 'lose') {
    calories = tdee - 500
  } else if (data.goal === 'gain') {
    calories = tdee + 300
  } else {
    calories = tdee
  }

  // Macro targets (balanced approach)
  const protein = Math.round(weight * 2) // 2g per kg body weight
  const fat = Math.round((calories * 0.25) / 9) // 25% of calories from fat
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4) // Remaining from carbs

  return {
    calories: Math.round(calories),
    protein,
    carbs,
    fat
  }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    heightCm: '',
    weightKg: '',
    activityLevel: '',
    goal: ''
  })

  const router = useRouter()
  const supabase = createClient()

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.fullName && formData.dateOfBirth && formData.gender
      case 2:
        return formData.heightCm && formData.weightKg
      case 3:
        return formData.activityLevel
      case 4:
        return formData.goal
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    setLoading(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login/patient')
      return
    }

    const targets = calculateTargets(formData)

    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id,
      full_name: formData.fullName,
      date_of_birth: formData.dateOfBirth,
      gender: formData.gender,
      height_cm: parseFloat(formData.heightCm),
      weight_kg: parseFloat(formData.weightKg),
      activity_level: formData.activityLevel,
      goal: formData.goal,
      daily_calorie_target: targets.calories,
      daily_protein_target: targets.protein,
      daily_carbs_target: targets.carbs,
      daily_fat_target: targets.fat,
      onboarding_completed: true,
      role: 'user',
      updated_at: new Date().toISOString()
    })

    if (error) {
      console.error('Error saving profile:', error)
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/patient/profile')
  }

  return (
    <div className='flex flex-1 flex-col items-center justify-center p-4'>
      <div className='w-full max-w-lg'>
        {/* Progress indicator */}
        <div className='mb-8 flex justify-center gap-2'>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Tell us about yourself'}
              {step === 2 && 'Your measurements'}
              {step === 3 && 'Activity level'}
              {step === 4 && 'Your goal'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'We need some basic info to personalize your experience'}
              {step === 2 && 'This helps us calculate your daily targets'}
              {step === 3 && 'How active are you on a typical week?'}
              {step === 4 && 'What would you like to achieve?'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <>
                <div className='space-y-2'>
                  <Label htmlFor='fullName'>Full Name</Label>
                  <Input
                    id='fullName'
                    placeholder='John Doe'
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='dateOfBirth'>Date of Birth</Label>
                  <Input
                    id='dateOfBirth'
                    type='date'
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Gender</Label>
                  <div className='grid grid-cols-2 gap-3'>
                    {['male', 'female'].map((gender) => (
                      <button
                        key={gender}
                        type='button'
                        onClick={() => updateField('gender', gender)}
                        className={`rounded-lg border p-4 text-center transition-colors ${
                          formData.gender === gender
                            ? 'border-primary bg-primary/10'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <span className='capitalize'>{gender}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Measurements */}
            {step === 2 && (
              <>
                <div className='space-y-2'>
                  <Label htmlFor='heightCm'>Height (cm)</Label>
                  <Input
                    id='heightCm'
                    type='number'
                    placeholder='175'
                    value={formData.heightCm}
                    onChange={(e) => updateField('heightCm', e.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='weightKg'>Weight (kg)</Label>
                  <Input
                    id='weightKg'
                    type='number'
                    placeholder='70'
                    value={formData.weightKg}
                    onChange={(e) => updateField('weightKg', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Step 3: Activity Level */}
            {step === 3 && (
              <div className='space-y-3'>
                {activityLevels.map((level) => (
                  <button
                    key={level.value}
                    type='button'
                    onClick={() => updateField('activityLevel', level.value)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      formData.activityLevel === level.value
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <p className='font-medium'>{level.label}</p>
                    <p className='text-sm text-muted-foreground'>{level.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 4: Goal */}
            {step === 4 && (
              <div className='space-y-3'>
                {goals.map((goal) => (
                  <button
                    key={goal.value}
                    type='button'
                    onClick={() => updateField('goal', goal.value)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      formData.goal === goal.value
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <p className='font-medium'>{goal.label}</p>
                    <p className='text-sm text-muted-foreground'>{goal.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className='flex justify-between pt-4'>
              <Button variant='outline' onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
                <ArrowLeft className='mr-2 size-4' />
                Back
              </Button>
              {step < 4 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                  Next
                  <ArrowRight className='ml-2 size-4' />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!canProceed() || loading}>
                  {loading ? (
                    'Saving...'
                  ) : (
                    <>
                      Complete
                      <Check className='ml-2 size-4' />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
