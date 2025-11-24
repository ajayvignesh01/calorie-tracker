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
    console.log('[v0] Starting food analysis...')
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
1. The name of the food using simple, generic terms that would appear in a nutrition database (e.g., "chicken breast fried" instead of "crispy fried chicken", "white rice" instead of "steamed jasmine rice")
2. An estimated quantity with appropriate units (e.g., "1 cup", "200g", "1 piece", "1 serving")

Use simple food names without brand names or elaborate descriptions. List each distinct food item separately.`
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Failed to analyze food image: ${errorMessage}` }, { status: 500 })
  }
}

async function fetchUSDANutrients(foodName: string, quantity: string): Promise<NutrientData> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}`
    console.log('USDA API URL:', url)
    console.log('USDA API Key (first 10 chars):', USDA_API_KEY?.substring(0, 10))

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: foodName,
        pageSize: 10,
        dataType: ['SR Legacy', 'Foundation', 'Survey (FNDDS)', 'Branded']
      })
    })

    if (!response.ok) {
      console.error(`USDA API error for "${foodName}": ${response.status}`)
      console.log(`[v0] Falling back to AI estimation for "${foodName}"`)
      return estimateNutrientsWithAI(foodName, quantity)
    }

    const data: USDASearchResponse = await response.json()

    console.log(`[v0] USDA Response for ${foodName}: ${data.foods?.length || 0} results`)

    if (!data.foods || data.foods.length === 0) {
      console.log(`[v0] No USDA results, falling back to AI estimation for "${foodName}"`)
      return estimateNutrientsWithAI(foodName, quantity)
    }

    // Find the best food entry - prefer ones with complete nutrient data
    // Priority: SR Legacy/Foundation > Survey > Branded (branded often lacks data)
    const food = findBestFoodMatch(data.foods)
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

    // If USDA returned 0 calories, fall back to AI estimation
    if (!nutrients.calories || nutrients.calories === 0) {
      console.log(`[v0] USDA returned 0 calories, falling back to AI estimation for "${foodName}"`)
      return estimateNutrientsWithAI(foodName, quantity)
    }

    return {
      foodName: food.description || foodName,
      quantity: quantity || 'per 100g',
      calories: nutrients.calories,
      protein: nutrients.protein || 0,
      carbs: nutrients.carbs || 0,
      fat: nutrients.fat || 0,
      source: 'USDA FoodData Central'
    }
  } catch (error) {
    console.error(`Error analyzing ${foodName}:`, error)
    console.log(`[v0] Error occurred, falling back to AI estimation for "${foodName}"`)
    return estimateNutrientsWithAI(foodName, quantity)
  }
}

async function estimateNutrientsWithAI(foodName: string, quantity: string): Promise<NutrientData> {
  try {
    console.log(`[v0] Estimating nutrients with AI for: ${foodName} (${quantity})`)

    const { object } = await generateObject({
      model: 'openai/gpt-4o',
      schema: z.object({
        calories: z.number().describe('Estimated calories in kcal'),
        protein: z.number().describe('Estimated protein in grams'),
        carbs: z.number().describe('Estimated carbohydrates in grams'),
        fat: z.number().describe('Estimated fat in grams')
      }),
      messages: [
        {
          role: 'user',
          content: `Estimate the nutritional content for: ${quantity} of ${foodName}

Provide realistic estimates based on typical nutritional values for this food. Return the values for the specified quantity, not per 100g.

Be accurate and use your knowledge of food nutrition.`
        }
      ]
    })

    console.log(`[v0] AI nutrition estimate:`, object)

    return {
      foodName,
      quantity,
      calories: Math.round(object.calories),
      protein: Math.round(object.protein * 10) / 10,
      carbs: Math.round(object.carbs * 10) / 10,
      fat: Math.round(object.fat * 10) / 10,
      source: 'AI Estimate'
    }
  } catch (error) {
    console.error(`Error estimating nutrients with AI for ${foodName}:`, error)
    return {
      foodName,
      quantity,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: 'AI Estimate',
      error: 'Failed to estimate'
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findBestFoodMatch(foods: any[]): any {
  // Score each food based on data quality
  const scored = foods.map((food) => {
    let score = 0

    // Prefer SR Legacy and Foundation data (more complete nutrient profiles)
    if (food.dataType === 'SR Legacy' || food.dataType === 'Foundation') {
      score += 100
    } else if (food.dataType === 'Survey (FNDDS)') {
      score += 50
    }
    // Branded gets no bonus (often incomplete)

    // Check if it has the key nutrients we need
    const nutrients = food.foodNutrients || []
    const hasCalories = nutrients.some(
      (n: { nutrientName: string }) => n.nutrientName === 'Energy'
    )
    const hasProtein = nutrients.some(
      (n: { nutrientName: string }) => n.nutrientName === 'Protein'
    )
    const hasCarbs = nutrients.some(
      (n: { nutrientName: string }) => n.nutrientName === 'Carbohydrate, by difference'
    )
    const hasFat = nutrients.some(
      (n: { nutrientName: string }) => n.nutrientName === 'Total lipid (fat)'
    )

    if (hasCalories) score += 25
    if (hasProtein) score += 25
    if (hasCarbs) score += 25
    if (hasFat) score += 25

    return { food, score }
  })

  // Sort by score descending and return the best match
  scored.sort((a, b) => b.score - a.score)
  console.log(
    `[v0] Best match: ${scored[0].food.description} (score: ${scored[0].score}, type: ${scored[0].food.dataType})`
  )
  return scored[0].food
}
