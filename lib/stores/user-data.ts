import { User } from '@supabase/supabase-js'
import { create } from 'zustand'

type UserDataStore = {
  userData: User | null
  setUserData: (userData: User | null) => void
}

export const useUserDataStore = create<UserDataStore>((set) => ({
  userData: null,
  setUserData: (userData) => set(() => ({ userData: userData }))
}))
