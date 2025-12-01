'use client'

import { Command, LayoutDashboard, History, User, UserPlus } from 'lucide-react'
import * as React from 'react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/patient/dashboard',
      icon: LayoutDashboard,
      isActive: true,
      items: []
    },
    {
      title: 'History',
      url: '/patient/history',
      icon: History,
      isActive: false,
      items: []
    },
    {
      title: 'Profile',
      url: '/patient/profile',
      icon: User,
      isActive: false,
      items: []
    },
    {
      title: 'Onboarding',
      url: '/patient/onboarding',
      icon: UserPlus,
      isActive: false,
      items: []
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant='inset' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <a href='#'>
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                  <Command className='size-4' />
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>Calorie Tracker</span>
                  <span className='truncate text-xs'>Enterprise</span>
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
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
