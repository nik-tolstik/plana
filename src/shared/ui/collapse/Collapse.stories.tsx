import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from '../button'
import { Collapse, CollapseContent, CollapseTrigger } from './Collapse'

const meta = {
  title: 'Shared UI/Collapse',
  component: Collapse,
  parameters: {
    layout: 'centered',
  },
  args: {
    defaultOpen: false,
  },
  argTypes: {
    defaultOpen: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Collapse>

export default meta

type Story = StoryObj<typeof meta>

function StoryFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-w-96 flex-col gap-6 p-8">{children}</div>
}

function RecoveryKeyList() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
      <div>vivid-river-621</div>
      <div>silver-orbit-048</div>
      <div>paper-signal-913</div>
    </div>
  )
}

export const Basic: Story = {
  render: function RenderBasic(args) {
    return (
      <StoryFrame>
        <Collapse className="w-80" {...args}>
          <CollapseTrigger
            render={
              <Button
                className="w-full justify-between [&[data-panel-open]_[data-slot=collapse-chevron]]:rotate-180"
                variant="outline"
              />
            }
          >
            Recovery keys
            <ChevronDownIcon
              data-icon="inline-end"
              data-slot="collapse-chevron"
              className="transition-transform duration-200 ease-out"
            />
          </CollapseTrigger>
          <CollapseContent>
            <div className="pt-3">
              <RecoveryKeyList />
            </div>
          </CollapseContent>
        </Collapse>
      </StoryFrame>
    )
  },
}

export const Controlled: Story = {
  render: function RenderControlled() {
    const [open, setOpen] = useState(false)

    return (
      <StoryFrame>
        <Collapse className="w-80" open={open} onOpenChange={setOpen}>
          <CollapseTrigger
            render={
              <Button
                className="w-full justify-between [&[data-panel-open]_[data-slot=collapse-chevron]]:rotate-180"
                variant="outline"
              />
            }
          >
            {open ? 'Hide details' : 'Show details'}
            <ChevronDownIcon
              data-icon="inline-end"
              data-slot="collapse-chevron"
              className="transition-transform duration-200 ease-out"
            />
          </CollapseTrigger>
          <CollapseContent keepMounted>
            <div className="pt-3">
              <RecoveryKeyList />
            </div>
          </CollapseContent>
        </Collapse>
      </StoryFrame>
    )
  },
}
