export type USDANutrient = {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
  derivationCode?: string
  derivationDescription?: string
  derivationId?: number
  foodNutrientSourceId?: number
  foodNutrientSourceCode?: string
  foodNutrientSourceDescription?: string
  rank?: number
  indentLevel?: number
  foodNutrientId?: number
  percentDailyValue?: number
}

export type USDAFood = {
  fdcId: number
  description: string
  dataType: string
  foodNutrients?: USDANutrient[]
  gtinUpc?: string
  publishedDate?: string
  brandOwner?: string
  ingredients?: string
  marketCountry?: string
  foodCategory?: string
  modifiedDate?: string
  dataSource?: string
  servingSizeUnit?: string
  servingSize?: number
}

export type USDASearchResponse = {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDAFood[]
  foodSearchCriteria?: {
    query: string
    generalSearchInput: string
    pageNumber: number
    numberOfResultsPerPage: number
    pageSize: number
    requireAllWords: boolean
  }
}

export type NutrientData = {
  foodName: string
  quantity: string
  calories: number
  protein: number
  carbs: number
  fat: number
  source: string
  error?: string
}

export type ParsedFoodItem = {
  foodName: string
  quantity: string
}
