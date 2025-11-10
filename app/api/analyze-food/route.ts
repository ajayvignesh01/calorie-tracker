import { generateText, tool } from 'ai'
import { z } from 'zod'

const USDA_API_KEY = process.env.USDA_API_KEY
if (!USDA_API_KEY) {
  throw new Error('USDA_API_KEY is not set')
}

const searchUSDANutrients = tool({
  description: 'Search the USDA FoodData Central API for nutritional information about a food item',
  inputSchema: z.object({
    query: z.string().describe('The food name to search for (e.g., "apple", "chicken breast")')
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=1&api_key=${USDA_API_KEY}`
      )

      if (!response.ok) {
        return { error: 'Failed to fetch from USDA API' }
      }

      const data = await response.json()

      if (!data.foods || data.foods.length === 0) {
        return { error: 'No food items found' }
      }

      const food = data.foods[0]
      const nutrients: Record<string, number> = {}

      if (food.foodNutrients && Array.isArray(food.foodNutrients)) {
        food.foodNutrients.forEach((nutrient: any) => {
          const nutrientName = nutrient?.nutrientName
          if (!nutrientName) return

          if (nutrientName === 'Energy') {
            nutrients.calories = Math.round(nutrient.value)
          } else if (nutrientName === 'Protein') {
            nutrients.protein = Math.round(nutrient.value * 10) / 10
          } else if (nutrientName === 'Carbohydrate, by difference') {
            nutrients.carbs = Math.round(nutrient.value * 10) / 10
          } else if (nutrientName === 'Total lipid (fat)') {
            nutrients.fat = Math.round(nutrient.value * 10) / 10
          }
        })
      }

      return {
        foodName: food.description,
        calories: nutrients.calories || 0,
        protein: nutrients.protein || 0,
        carbs: nutrients.carbs || 0,
        fat: nutrients.fat || 0
      }
    } catch (error) {
      console.error('USDA API error:', error)
      return { error: 'Failed to query USDA database' }
    }
  }
})

export async function POST(req: Request) {
  const { image } = await req.json()

  if (!image) {
    return Response.json({ error: 'No image provided' }, { status: 400 })
  }

  try {
    const { text } = await generateText({
      model: 'openai/gpt-4o',
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
              text: `Analyze this food image and identify all food items visible:
For each food item, respond in this exact format on separate lines:
FOOD: [food name]
QUANTITY: [estimated quantity with unit, e.g., "1 cup", "200g"]

Example:
FOOD: Rice
QUANTITY: 1 cup
FOOD: Chicken
QUANTITY: 100g

Be specific and concise. List each distinct food item.`
            }
          ]
        }
      ],
      tools: {
        searchUSDANutrients
      }
    })

    console.log('[v0] AI Response:', text)

    const foodItems: Array<{ foodName: string; quantity: string }> = []
    const lines = text.split('\n')

    let currentFood: { foodName: string; quantity: string } | null = null
    for (const line of lines) {
      if (line.startsWith('FOOD:')) {
        if (currentFood && currentFood.foodName && currentFood.quantity) {
          foodItems.push(currentFood)
        }
        currentFood = { foodName: line.replace('FOOD:', '').trim(), quantity: '' }
      } else if (line.startsWith('QUANTITY:')) {
        if (currentFood) {
          currentFood.quantity = line.replace('QUANTITY:', '').trim()
        }
      }
    }
    if (currentFood && currentFood.foodName && currentFood.quantity) {
      foodItems.push(currentFood)
    }

    console.log('[v0] Parsed food items:', foodItems)

    if (foodItems.length === 0) {
      return Response.json({ error: 'Could not identify food in image' }, { status: 400 })
    }

    const results = await Promise.all(
      foodItems.map(async (item) => {
        try {
          const response = await fetch(
            `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(item.foodName)}&pageSize=1&api_key=${USDA_API_KEY}`
          )

          if (!response.ok) {
            return {
              foodName: item.foodName,
              quantity: item.quantity,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              source: 'USDA FoodData Central',
              error: 'Could not find in database'
            }
          }

          const usda_data = await response.json()

          console.log(
            `[v0] USDA Response for ${item.foodName}:`,
            JSON.stringify(usda_data, null, 2)
          )

          if (!usda_data.foods || usda_data.foods.length === 0) {
            return {
              foodName: item.foodName,
              quantity: item.quantity,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              source: 'USDA FoodData Central',
              error: 'Not found in database'
            }
          }

          const food = usda_data.foods[0]
          const nutrients: Record<string, number> = {}

          console.log(`[v0] Food item: ${food.description}`)
          console.log(`[v0] Total nutrients in item: ${food.foodNutrients?.length || 0}`)

          if (food.foodNutrients && Array.isArray(food.foodNutrients)) {
            food.foodNutrients.forEach((nutrient: any, index: number) => {
              const nutrientName = nutrient?.nutrientName
              const nutrientValue = nutrient?.value

              console.log(`[v0] Nutrient ${index}:`, {
                name: nutrientName,
                value: nutrientValue,
                unit: nutrient?.unitName
              })

              if (!nutrientName) return

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
            foodName: food.description || item.foodName,
            quantity: item.quantity || 'per 100g',
            calories: nutrients.calories || 0,
            protein: nutrients.protein || 0,
            carbs: nutrients.carbs || 0,
            fat: nutrients.fat || 0,
            source: 'USDA FoodData Central'
          }
        } catch (error) {
          console.error(`Error analyzing ${item.foodName}:`, error)
          return {
            foodName: item.foodName,
            quantity: item.quantity,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            source: 'USDA FoodData Central',
            error: 'Failed to fetch'
          }
        }
      })
    )

    return Response.json({ foods: results })
  } catch (error) {
    console.error('Error analyzing food:', error)
    return Response.json({ error: 'Failed to analyze food image' }, { status: 500 })
  }
}
