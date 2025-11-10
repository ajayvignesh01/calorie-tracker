'use client'

import type React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Upload } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setResults(null)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeFood = async () => {
    if (!image) return

    setLoading(true)
    setError(null)
    setResults(null)

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

        {results && (
          <div className='space-y-4'>
            {results.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{result.foodName}</CardTitle>
                  <CardDescription>{result.quantity}</CardDescription>
                </CardHeader>
                <CardContent>
                  {result.error && (
                    <p className='mb-4 text-sm text-muted-foreground'>⚠️ {result.error}</p>
                  )}
                  <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    <div className='space-y-1 rounded-lg bg-muted p-3'>
                      <p className='text-xs text-muted-foreground'>Calories</p>
                      <p className='text-2xl font-bold'>{result.calories}</p>
                    </div>
                    <div className='space-y-1 rounded-lg bg-muted p-3'>
                      <p className='text-xs text-muted-foreground'>Protein</p>
                      <p className='text-lg font-semibold'>{result.protein}g</p>
                    </div>
                    <div className='space-y-1 rounded-lg bg-muted p-3'>
                      <p className='text-xs text-muted-foreground'>Carbs</p>
                      <p className='text-lg font-semibold'>{result.carbs}g</p>
                    </div>
                    <div className='space-y-1 rounded-lg bg-muted p-3'>
                      <p className='text-xs text-muted-foreground'>Fat</p>
                      <p className='text-lg font-semibold'>{result.fat}g</p>
                    </div>
                  </div>
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

            <p className='text-center text-xs text-muted-foreground'>
              Data source: USDA FoodData Central
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
