'use client'

import type React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import { Check, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface FoodResult {
  foodName: string
  quantity: string
  calories: number
  protein: number
  carbs: number
  fat: number
  source: string
  error?: string
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FoodResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        let fileToRead = file

        // Check if the file is HEIC/HEIF and convert it to JPEG
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
          setLoading(true)
          try {
            // Dynamically import heic2any only when needed (browser-only)
            const heic2any = (await import('heic2any')).default
            const convertedBlob = await heic2any({
              blob: file,
              toType: 'image/jpeg',
              quality: 0.9
            })
            // heic2any can return Blob or Blob[], handle both cases
            const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
            fileToRead = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' })
          } catch (conversionError) {
            console.error('HEIC conversion error:', conversionError)
            setError('Failed to convert HEIC image. Please use JPG or PNG format.')
            setLoading(false)
            return
          } finally {
            setLoading(false)
          }
        }

        const reader = new FileReader()
        reader.onloadend = () => {
          setImage(reader.result as string)
          setResults(null)
          setError(null)
          setSaved(false)
        }
        reader.readAsDataURL(fileToRead)
      } catch (err) {
        setError('Failed to load image. Please try another file.')
        console.error('Image load error:', err)
      }
    }
  }

  const analyzeFood = async () => {
    if (!image) return

    setLoading(true)
    setError(null)
    setResults(null)
    setSaved(false)

    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze food')
      }

      const data = await response.json()
      setResults(data.foods)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateFoodResult = (index: number, field: keyof FoodResult, value: string | number) => {
    if (!results) return
    const updated = [...results]
    if (field === 'calories' || field === 'protein' || field === 'carbs' || field === 'fat') {
      updated[index] = { ...updated[index], [field]: Number(value) || 0 }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setResults(updated)
  }

  const saveToHistory = async () => {
    if (!results) return

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (user && results.length > 0) {
      const entries = results.map((food: FoodResult) => ({
        user_id: user.id,
        food_name: food.foodName,
        quantity: food.quantity,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat
      }))

      const { error: saveError } = await supabase.from('food_entries').insert(entries)

      if (saveError) {
        console.error('Failed to save entries:', saveError)
        setError('Failed to save to history')
      } else {
        setSaved(true)
      }
    }
  }

  const discardResults = () => {
    setResults(null)
    setImage(null)
    setSaved(false)
    setError(null)
  }

  const totals = results
    ? {
        calories: results.reduce((sum, f) => sum + f.calories, 0),
        protein: results.reduce((sum, f) => sum + f.protein, 0),
        carbs: results.reduce((sum, f) => sum + f.carbs, 0),
        fat: results.reduce((sum, f) => sum + f.fat, 0)
      }
    : null

  return (
    <div className='flex flex-1 flex-col gap-4 p-4'>
      <div className='mx-auto w-full max-w-3xl space-y-4'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight'>Analyze Food</h2>
          <p className='text-muted-foreground'>
            Upload a photo of your meal to get nutritional information
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
            <CardDescription>Take or upload a clear photo of your meal</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center transition-colors hover:border-muted-foreground/50'>
              <input
                type='file'
                accept='image/*'
                onChange={handleImageChange}
                className='hidden'
                id='image-input'
              />
              <label htmlFor='image-input' className='flex cursor-pointer flex-col items-center'>
                <Upload className='mb-2 size-10 text-muted-foreground' />
                <p className='mb-1 text-sm font-medium'>Click to upload or drag and drop</p>
                <p className='text-xs text-muted-foreground'>PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>

            {image && (
              <div className='relative aspect-video w-full overflow-hidden rounded-lg border bg-muted'>
                <Image
                  src={image || '/placeholder.svg'}
                  alt='Food preview'
                  fill
                  className='object-cover'
                />
              </div>
            )}

            <Button onClick={analyzeFood} disabled={!image || loading} className='w-full' size='lg'>
              {loading ? (
                <>
                  <Spinner className='mr-2 h-4 w-4' />
                  Analyzing...
                </>
              ) : (
                'Analyze Food'
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Card className='border-destructive'>
            <CardContent className='pt-6'>
              <p className='text-sm text-destructive'>Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {results && !saved && (
          <div className='space-y-4'>
            {results.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className='space-y-2'>
                    <Input
                      value={result.foodName}
                      onChange={(e) => updateFoodResult(index, 'foodName', e.target.value)}
                      className='text-lg font-semibold'
                      placeholder='Food name'
                    />
                    <Input
                      value={result.quantity}
                      onChange={(e) => updateFoodResult(index, 'quantity', e.target.value)}
                      className='text-sm text-muted-foreground'
                      placeholder='Quantity'
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {result.error && (
                    <p className='mb-4 text-sm text-muted-foreground'>⚠️ {result.error}</p>
                  )}
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    <div className='space-y-1 rounded-lg bg-muted p-3'>
                      <label className='text-xs text-muted-foreground'>Calories</label>
                      <Input
                        type='number'
                        value={result.calories}
                        onChange={(e) => updateFoodResult(index, 'calories', e.target.value)}
                        className='h-8 text-xl font-bold'
                      />
                    </div>
                    <div className='space-y-1 rounded-lg bg-muted p-3'>
                      <label className='text-xs text-muted-foreground'>Protein (g)</label>
                      <Input
                        type='number'
                        step='0.1'
                        value={result.protein}
                        onChange={(e) => updateFoodResult(index, 'protein', e.target.value)}
                        className='h-8 text-lg font-semibold'
                      />
                    </div>
                    <div className='space-y-1 rounded-lg bg-muted p-3'>
                      <label className='text-xs text-muted-foreground'>Carbs (g)</label>
                      <Input
                        type='number'
                        step='0.1'
                        value={result.carbs}
                        onChange={(e) => updateFoodResult(index, 'carbs', e.target.value)}
                        className='h-8 text-lg font-semibold'
                      />
                    </div>
                    <div className='space-y-1 rounded-lg bg-muted p-3'>
                      <label className='text-xs text-muted-foreground'>Fat (g)</label>
                      <Input
                        type='number'
                        step='0.1'
                        value={result.fat}
                        onChange={(e) => updateFoodResult(index, 'fat', e.target.value)}
                        className='h-8 text-lg font-semibold'
                      />
                    </div>
                  </div>
                  <p className='mt-2 text-xs text-muted-foreground'>Source: {result.source}</p>
                </CardContent>
              </Card>
            ))}

            {totals && results.length > 1 && (
              <Card className='border-primary/50 bg-accent/50'>
                <CardHeader>
                  <CardTitle>Meal Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    <div className='space-y-1 rounded-lg bg-background p-3'>
                      <p className='text-xs text-muted-foreground'>Total Calories</p>
                      <p className='text-2xl font-bold'>{totals.calories}</p>
                    </div>
                    <div className='space-y-1 rounded-lg bg-background p-3'>
                      <p className='text-xs text-muted-foreground'>Total Protein</p>
                      <p className='text-lg font-semibold'>{totals.protein.toFixed(1)}g</p>
                    </div>
                    <div className='space-y-1 rounded-lg bg-background p-3'>
                      <p className='text-xs text-muted-foreground'>Total Carbs</p>
                      <p className='text-lg font-semibold'>{totals.carbs.toFixed(1)}g</p>
                    </div>
                    <div className='space-y-1 rounded-lg bg-background p-3'>
                      <p className='text-xs text-muted-foreground'>Total Fat</p>
                      <p className='text-lg font-semibold'>{totals.fat.toFixed(1)}g</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className='flex gap-3'>
              <Button onClick={saveToHistory} className='flex-1' size='lg'>
                <Check className='mr-2 size-4' />
                Save to History
              </Button>
              <Button onClick={discardResults} variant='outline' size='lg'>
                <X className='mr-2 size-4' />
                Discard
              </Button>
            </div>
          </div>
        )}

        {saved && (
          <div className='space-y-4'>
            <div className='flex items-center justify-center gap-2 rounded-lg bg-green-500/10 p-3 text-green-600'>
              <Check className='size-4' />
              <p className='text-sm font-medium'>Saved to your food history</p>
            </div>
            <Button onClick={discardResults} variant='outline' className='w-full'>
              Analyze Another Meal
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
