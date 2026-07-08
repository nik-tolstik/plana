import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  BellIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClockIcon,
  SettingsIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '../button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from './Popover'

const alignments = ['start', 'center', 'end'] as const

const meta = {
  title: 'Shared UI/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Popover>

export default meta

type Story = StoryObj<typeof meta>

function StoryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-3xl flex-col items-center gap-8 p-10">
      {children}
    </div>
  )
}

function InfoRow({
  children,
  icon: Icon,
}: {
  children: ReactNode
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export const Basic: Story = {
  render: function RenderBasic() {
    return (
      <StoryFrame>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            Open popover
            <ChevronDownIcon data-icon="inline-end" />
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Notifications</PopoverTitle>
              <PopoverDescription>
                You are all caught up. Good job!
              </PopoverDescription>
            </PopoverHeader>
            <div className="flex flex-col gap-2 text-sm">
              <InfoRow icon={BellIcon}>No unread alerts</InfoRow>
              <InfoRow icon={ClockIcon}>Last checked 2 minutes ago</InfoRow>
            </div>
          </PopoverContent>
        </Popover>
      </StoryFrame>
    )
  },
}

export const Alignments: Story = {
  render: function RenderAlignments() {
    return (
      <StoryFrame>
        <div className="flex items-center gap-3">
          {alignments.map((align) => (
            <Popover key={align}>
              <PopoverTrigger render={<Button variant="outline" />}>
                {align}
              </PopoverTrigger>
              <PopoverContent align={align}>
                <PopoverHeader>
                  <PopoverTitle>Alignment</PopoverTitle>
                  <PopoverDescription>
                    The popover is aligned to {align}.
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      </StoryFrame>
    )
  },
}

export const OpenOnHover: Story = {
  render: function RenderOpenOnHover() {
    return (
      <StoryFrame>
        <Popover>
          <PopoverTrigger openOnHover render={<Button variant="outline" />}>
            Schedule
            <CalendarDaysIcon data-icon="inline-end" />
          </PopoverTrigger>
          <PopoverContent sideOffset={8}>
            <PopoverHeader>
              <PopoverTitle>Planning session</PopoverTitle>
              <PopoverDescription>
                Wednesday, 10:00 AM with the product team.
              </PopoverDescription>
            </PopoverHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SettingsIcon aria-hidden="true" />
              <span>Reminders enabled</span>
            </div>
          </PopoverContent>
        </Popover>
      </StoryFrame>
    )
  },
}
