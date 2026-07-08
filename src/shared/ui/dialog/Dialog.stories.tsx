import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsIcon, UserIcon } from 'lucide-react'

import { Button } from '../button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './Dialog'

const meta = {
  title: 'Shared UI/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Dialog>

export default meta

type Story = StoryObj<typeof meta>

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-96 flex-col items-center gap-8 p-10">
      {children}
    </div>
  )
}

export const Basic: Story = {
  render: function RenderBasic() {
    return (
      <StoryFrame>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Open dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workspace settings</DialogTitle>
              <DialogDescription>
                Review the settings for this workspace before continuing.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm">
              <SettingsIcon aria-hidden="true" />
              <span>Notifications and access controls are enabled.</span>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StoryFrame>
    )
  },
}

export const WithoutCloseButton: Story = {
  render: function RenderWithoutCloseButton() {
    return (
      <StoryFrame>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            No corner close
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Invite teammate</DialogTitle>
              <DialogDescription>
                Send an invitation after confirming the teammate details.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-3 text-sm">
              <UserIcon aria-hidden="true" />
              <span>Alex will receive editor permissions.</span>
            </div>
            <DialogFooter showCloseButton>
              <Button>Send invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StoryFrame>
    )
  },
}
