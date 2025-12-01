'use client'

import { LayoutDashboard, LogOut, Stethoscope } from 'lucide-react'
import * as React from 'react'

import { NavMain } from '@/components/nav-main'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/doctor/dashboard',
      icon: LayoutDashboard,
      isActive: true,
      items: []
    }
  ]
}

export function DoctorSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login/doctor')
  }

  return (
    <Sidebar variant='inset' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <a href='/doctor/dashboard'>
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                  <Stethoscope className='size-4' />
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>Doctor Portal</span>
                  <span className='truncate text-xs'>Calorie Tracker</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className='size-4' />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
