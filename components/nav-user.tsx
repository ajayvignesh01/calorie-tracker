'use client'

import { ChevronsUpDown, LogOut } from 'lucide-react'

import { signOut } from '@/app/(auth)/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { useUserDataStore } from '@/lib/stores/user-data'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr/immutable'

export function NavUser() {
  const { isMobile } = useSidebar()

  const supabase = createClient()

  const setUserData = useUserDataStore((s) => s.setUserData)

  const { data: userData, isLoading } = useSWR('userData', async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    setUserData(user)

    return user
  })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage
                  src={userData?.user_metadata.avatar_url}
                  alt={userData?.user_metadata.full_name}
                />
                <AvatarFallback className='rounded-lg'>G</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{userData?.user_metadata.full_name}</span>
                <span className='truncate text-xs'>{userData?.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage
                    src={userData?.user_metadata.avatar_url}
                    alt={userData?.user_metadata.full_name}
                  />
                  <AvatarFallback className='rounded-lg'>G</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>{userData?.user_metadata.full_name}</span>
                  <span className='truncate text-xs'>{userData?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
