'use client'

import type React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
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
    <main className='min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 dark:from-slate-900 dark:to-slate-800'>
      <div className='mx-auto max-w-2xl py-8'>
        <div className='mb-8 text-center'>
          <h1 className='mb-2 text-4xl font-bold text-orange-900 dark:text-orange-100'>
            🍎 Calorie Counter
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            Upload a photo of your food and get instant calorie estimates powered by AI
          </p>
        </div>

        <Card className='border-2 border-orange-200 shadow-lg dark:border-orange-900'>
          <CardHeader className='bg-orange-100 dark:bg-orange-950'>
            <CardTitle>Upload Food Image</CardTitle>
            <CardDescription>Take or upload a clear photo of your meal</CardDescription>
          </CardHeader>
          <CardContent className='pt-6'>
            <div className='space-y-4'>
              <div className='rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-8 text-center dark:border-orange-700 dark:bg-orange-950/20'>
                <input
                  type='file'
                  accept='image/*'
                  onChange={handleImageChange}
                  className='hidden'
                  id='image-input'
                />
                <label htmlFor='image-input' className='cursor-pointer'>
                  <div className='mb-2 text-5xl'>📷</div>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Click to upload or drag and drop
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-500'>
                    PNG, JPG, GIF up to 10MB
                  </p>
                </label>
              </div>

              {image && (
                <div className='relative h-48 w-full overflow-hidden rounded-lg bg-gray-200'>
                  <Image
                    src={image || '/placeholder.svg'}
                    alt='Food preview'
                    fill
                    className='object-cover'
                  />
                </div>
              )}

              <Button
                onClick={analyzeFood}
                disabled={!image || loading}
                className='w-full bg-orange-600 text-white hover:bg-orange-700'
                size='lg'
              >
                {loading ? (
                  <>
                    <Spinner className='mr-2 h-4 w-4' />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Food'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className='mt-6 border-red-200 dark:border-red-900'>
            <CardContent className='pt-6'>
              <p className='text-red-600 dark:text-red-400'>Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {results && (
          <div className='mt-6 space-y-4'>
            {results.map((result, index) => (
              <Card key={index} className='border-green-200 dark:border-green-900'>
                <CardHeader className='bg-green-100 dark:bg-green-950'>
                  <CardTitle className='text-green-900 dark:text-green-100'>
                    {result.foodName}
                  </CardTitle>
                  <CardDescription className='text-green-800 dark:text-green-200'>
                    {result.quantity}
                  </CardDescription>
                </CardHeader>
                <CardContent className='pt-6'>
                  {result.error && (
                    <p className='mb-4 text-yellow-600 dark:text-yellow-400'>⚠️ {result.error}</p>
                  )}
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='rounded bg-orange-50 p-3 dark:bg-orange-950/20'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Calories</p>
                      <p className='text-2xl font-bold text-orange-900 dark:text-orange-100'>
                        {result.calories}
                      </p>
                    </div>
                    <div className='rounded bg-blue-50 p-3 dark:bg-blue-950/20'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Protein</p>
                      <p className='text-lg font-semibold text-blue-900 dark:text-blue-100'>
                        {result.protein}g
                      </p>
                    </div>
                    <div className='rounded bg-amber-50 p-3 dark:bg-amber-950/20'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Carbs</p>
                      <p className='text-lg font-semibold text-amber-900 dark:text-amber-100'>
                        {result.carbs}g
                      </p>
                    </div>
                    <div className='rounded bg-red-50 p-3 dark:bg-red-950/20'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Fat</p>
                      <p className='text-lg font-semibold text-red-900 dark:text-red-100'>
                        {result.fat}g
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {totals && results.length > 1 && (
              <Card className='border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/20'>
                <CardHeader className='bg-purple-100 dark:bg-purple-950'>
                  <CardTitle className='text-purple-900 dark:text-purple-100'>
                    Total for Meal
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-6'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='rounded bg-purple-100 p-3 dark:bg-purple-900/30'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Total Calories</p>
                      <p className='text-2xl font-bold text-purple-900 dark:text-purple-100'>
                        {totals.calories}
                      </p>
                    </div>
                    <div className='rounded bg-purple-100 p-3 dark:bg-purple-900/30'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Total Protein</p>
                      <p className='text-lg font-semibold text-purple-900 dark:text-purple-100'>
                        {totals.protein.toFixed(1)}g
                      </p>
                    </div>
                    <div className='rounded bg-purple-100 p-3 dark:bg-purple-900/30'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Total Carbs</p>
                      <p className='text-lg font-semibold text-purple-900 dark:text-purple-100'>
                        {totals.carbs.toFixed(1)}g
                      </p>
                    </div>
                    <div className='rounded bg-purple-100 p-3 dark:bg-purple-900/30'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>Total Fat</p>
                      <p className='text-lg font-semibold text-purple-900 dark:text-purple-100'>
                        {totals.fat.toFixed(1)}g
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className='pt-2 text-center text-xs text-gray-500 dark:text-gray-500'>
              Data source: USDA FoodData Central
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
