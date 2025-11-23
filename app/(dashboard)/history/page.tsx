'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

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

export default function HistoryPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Get the first and last day of the current month
  const monthStart = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  }, [currentDate])

  const monthEnd = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  }, [currentDate])

  // Fetch food entries for the current month
  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', new Date(monthEnd.getTime() + 86400000).toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching entries:', error)
    } else {
      setFoodEntries(data || [])
    }
    setLoading(false)
  }, [supabase, monthStart, monthEnd])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

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

    // Add empty slots for days before the month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
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

  const handleDayClick = (day: DayData) => {
    if (day.entries.length > 0) {
      setSelectedDay(day)
      setIsModalOpen(true)
    }
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

  return (
    <div className='flex flex-1 flex-col gap-4 p-4'>
      <div className='mx-auto w-full max-w-5xl space-y-4'>
        <div>
          <h2 className='text-2xl font-semibold tracking-tight'>Food History</h2>
          <p className='text-muted-foreground'>View your daily food intake and macros</p>
        </div>

        <Card>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <button
                onClick={goToPreviousMonth}
                className='hover:bg-muted rounded-md p-2 transition-colors'
              >
                <ChevronLeft className='size-5' />
              </button>
              <CardTitle className='text-xl'>{monthYear}</CardTitle>
              <button
                onClick={goToNextMonth}
                className='hover:bg-muted rounded-md p-2 transition-colors'
              >
                <ChevronRight className='size-5' />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='flex h-96 items-center justify-center'>
                <p className='text-muted-foreground'>Loading...</p>
              </div>
            ) : (
              <div className='grid grid-cols-7 gap-1'>
                {/* Week day headers */}
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className='text-muted-foreground p-2 text-center text-sm font-medium'
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    onClick={() => day && handleDayClick(day)}
                    className={`min-h-24 rounded-lg border p-2 transition-colors ${
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
                            <div className='text-xs font-semibold text-orange-500'>
                              {day.totals.calories} cal
                            </div>
                            <div className='text-muted-foreground hidden text-[10px] sm:block'>
                              <span className='text-blue-500'>P:{day.totals.protein.toFixed(0)}g</span>
                              {' '}
                              <span className='text-green-500'>C:{day.totals.carbs.toFixed(0)}g</span>
                              {' '}
                              <span className='text-yellow-500'>F:{day.totals.fat.toFixed(0)}g</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly summary */}
        {!loading && foodEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>Total intake for {monthYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <div className='bg-muted space-y-1 rounded-lg p-3'>
                  <p className='text-muted-foreground text-xs'>Total Calories</p>
                  <p className='text-2xl font-bold'>
                    {foodEntries.reduce((sum, e) => sum + e.calories, 0).toLocaleString()}
                  </p>
                </div>
                <div className='bg-muted space-y-1 rounded-lg p-3'>
                  <p className='text-muted-foreground text-xs'>Total Protein</p>
                  <p className='text-lg font-semibold'>
                    {foodEntries.reduce((sum, e) => sum + Number(e.protein), 0).toFixed(1)}g
                  </p>
                </div>
                <div className='bg-muted space-y-1 rounded-lg p-3'>
                  <p className='text-muted-foreground text-xs'>Total Carbs</p>
                  <p className='text-lg font-semibold'>
                    {foodEntries.reduce((sum, e) => sum + Number(e.carbs), 0).toFixed(1)}g
                  </p>
                </div>
                <div className='bg-muted space-y-1 rounded-lg p-3'>
                  <p className='text-muted-foreground text-xs'>Total Fat</p>
                  <p className='text-lg font-semibold'>
                    {foodEntries.reduce((sum, e) => sum + Number(e.fat), 0).toFixed(1)}g
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Day detail modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {selectedDay?.date.toLocaleDateString('default', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </DialogTitle>
            <DialogDescription>
              {selectedDay?.entries.length} food{selectedDay?.entries.length !== 1 ? 's' : ''} logged
            </DialogDescription>
          </DialogHeader>

          {selectedDay && (
            <div className='space-y-4'>
              {/* Day totals */}
              <div className='grid grid-cols-4 gap-2'>
                <div className='rounded-lg bg-orange-500/10 p-2 text-center'>
                  <p className='text-xs text-orange-500'>Calories</p>
                  <p className='font-bold text-orange-500'>{selectedDay.totals.calories}</p>
                </div>
                <div className='rounded-lg bg-blue-500/10 p-2 text-center'>
                  <p className='text-xs text-blue-500'>Protein</p>
                  <p className='font-bold text-blue-500'>{selectedDay.totals.protein.toFixed(1)}g</p>
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

              {/* Individual food entries */}
              <div className='space-y-2'>
                <h4 className='text-sm font-medium'>Food Items</h4>
                {selectedDay.entries.map((entry) => (
                  <div key={entry.id} className='bg-muted rounded-lg p-3'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <p className='font-medium'>{entry.food_name}</p>
                        {entry.quantity && (
                          <p className='text-muted-foreground text-sm'>{entry.quantity}</p>
                        )}
                      </div>
                      <p className='font-semibold text-orange-500'>{entry.calories} cal</p>
                    </div>
                    <div className='mt-2 flex gap-4 text-sm'>
                      <span className='text-blue-500'>P: {entry.protein}g</span>
                      <span className='text-green-500'>C: {entry.carbs}g</span>
                      <span className='text-yellow-500'>F: {entry.fat}g</span>
                    </div>
                    <p className='text-muted-foreground mt-1 text-xs'>
                      {new Date(entry.created_at).toLocaleTimeString('default', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
