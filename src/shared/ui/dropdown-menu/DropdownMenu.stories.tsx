import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ArchiveIcon,
  BellIcon,
  ChevronDownIcon,
  CopyIcon,
  CreditCardIcon,
  FolderOpenIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SettingsIcon,
  TrashIcon,
} from 'lucide-react'

import { Button } from '../button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './DropdownMenu'

const meta = {
  title: 'Shared UI/DropdownMenu',
  component: DropdownMenu,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DropdownMenu>

export default meta

type Story = StoryObj<typeof meta>

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-80 flex-col items-center gap-8 p-10">
      {children}
    </div>
  )
}

export const Basic: Story = {
  render: function RenderBasic() {
    return (
      <StoryFrame>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Open
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Project</DropdownMenuLabel>
              <DropdownMenuItem>
                <PencilIcon />
                Rename
                <DropdownMenuShortcut>R</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CopyIcon />
                Duplicate
                <DropdownMenuShortcut>D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArchiveIcon />
                Archive
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive">
                <TrashIcon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </StoryFrame>
    )
  },
}

export const Complex: Story = {
  render: function RenderComplex() {
    return (
      <StoryFrame>
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Actions
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked>
                <BellIcon />
                Notifications
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>
                <FolderOpenIcon />
                Show archived
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup defaultValue="card">
              <DropdownMenuLabel>Billing</DropdownMenuLabel>
              <DropdownMenuRadioItem value="card">
                <CreditCardIcon />
                Card
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="invoice">
                <SettingsIcon />
                Invoice
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <MoreHorizontalIcon />
                  More
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <PencilIcon />
                      Edit details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <LogOutIcon />
                      Leave workspace
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </StoryFrame>
    )
  },
}
