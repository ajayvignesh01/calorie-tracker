import { generateObject } from 'ai'
import { z } from 'zod'
import { NutrientData, USDANutrient, USDASearchResponse } from './types'

const USDA_API_KEY = process.env.USDA_API_KEY
if (!USDA_API_KEY) {
  throw new Error('USDA_API_KEY is not set')
}

export async function POST(req: Request) {
  const { image } = await req.json()

  if (!image) {
    return Response.json({ error: 'No image provided' }, { status: 400 })
  }

  try {
    const { object } = await generateObject({
      model: 'openai/gpt-4o',
      schema: z.object({
        foodItems: z.array(
          z.object({
            foodName: z.string().describe('The name of the food item'),
            quantity: z
              .string()
              .describe('Estimated quantity with unit (e.g., "1 cup", "200g", "1 piece")')
          })
        )
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image
            },
            {
              type: 'text',
              text: `Analyze this food image and identify all food items visible. For each distinct food item, provide:
1. The specific name of the food
2. An estimated quantity with appropriate units (e.g., "1 cup", "200g", "1 piece", "1 serving")

Be specific and concise. List each distinct food item separately.`
            }
          ]
        }
      ]
    })

    console.log('[v0] AI Response:', object)

    const foodItems = object.foodItems

    console.log('[v0] Parsed food items:', foodItems)

    if (foodItems.length === 0) {
      return Response.json({ error: 'Could not identify food in image' }, { status: 400 })
    }

    const results = await Promise.all(
      foodItems.map((item) => fetchUSDANutrients(item.foodName, item.quantity))
    )

    return Response.json({ foods: results })
  } catch (error) {
    console.error('Error analyzing food:', error)
    return Response.json({ error: 'Failed to analyze food image' }, { status: 500 })
  }
}

async function fetchUSDANutrients(foodName: string, quantity: string): Promise<NutrientData> {
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${USDA_API_KEY}`
    )

    if (!response.ok) {
      return {
        foodName,
        quantity,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        source: 'USDA FoodData Central',
        error: 'Could not find in database'
      }
    }

    const data: USDASearchResponse = await response.json()

    console.log(`[v0] USDA Response for ${foodName}:`, JSON.stringify(data, null, 2))

    if (!data.foods || data.foods.length === 0) {
      return {
        foodName,
        quantity,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        source: 'USDA FoodData Central',
        error: 'Not found in database'
      }
    }

    const food = data.foods[0]
    const nutrients: Record<string, number> = {}

    console.log(`[v0] Food item: ${food.description}`)
    console.log(`[v0] Total nutrients in item: ${food.foodNutrients?.length || 0}`)

    if (food.foodNutrients && Array.isArray(food.foodNutrients)) {
      food.foodNutrients.forEach((nutrient: USDANutrient, index: number) => {
        const nutrientName = nutrient.nutrientName
        const nutrientValue = nutrient.value

        console.log(`[v0] Nutrient ${index}:`, {
          name: nutrientName,
          value: nutrientValue,
          unit: nutrient.unitName
        })

        if (nutrientName === 'Energy') {
          nutrients.calories = Math.round(nutrientValue)
          console.log('[v0] Found Energy (calories):', nutrientValue)
        } else if (nutrientName === 'Protein') {
          nutrients.protein = Math.round(nutrientValue * 10) / 10
          console.log('[v0] Found Protein:', nutrientValue)
        } else if (nutrientName === 'Carbohydrate, by difference') {
          nutrients.carbs = Math.round(nutrientValue * 10) / 10
          console.log('[v0] Found Carbs:', nutrientValue)
        } else if (nutrientName === 'Total lipid (fat)') {
          nutrients.fat = Math.round(nutrientValue * 10) / 10
          console.log('[v0] Found Fat:', nutrientValue)
        }
      })
    }

    console.log('[v0] Final nutrients extracted:', nutrients)

    return {
      foodName: food.description || foodName,
      quantity: quantity || 'per 100g',
      calories: nutrients.calories || 0,
      protein: nutrients.protein || 0,
      carbs: nutrients.carbs || 0,
      fat: nutrients.fat || 0,
      source: 'USDA FoodData Central'
    }
  } catch (error) {
    console.error(`Error analyzing ${foodName}:`, error)
    return {
      foodName,
      quantity,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: 'USDA FoodData Central',
      error: 'Failed to fetch'
    }
  }
}
