import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'

import { Checkbox } from './Checkbox'

const meta = {
  title: 'Shared UI/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    indeterminate: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
  },
  args: {
    defaultChecked: true,
  },
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

function StoryFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-w-96 flex-col gap-8 p-8">{children}</div>
}

function StoryGroup({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function LabeledCheckbox({
  children,
  ...props
}: ComponentProps<typeof Checkbox> & {
  children: ReactNode
}) {
  return (
    <label className="flex w-fit items-center gap-2 text-sm leading-none">
      <Checkbox {...props} />
      <span>{children}</span>
    </label>
  )
}

export const Playground: Story = {
  render: function RenderPlayground(args) {
    return (
      <StoryFrame>
        <LabeledCheckbox {...args}>Enable notifications</LabeledCheckbox>
      </StoryFrame>
    )
  },
}

export const States: Story = {
  render: function RenderStates() {
    return (
      <StoryFrame>
        <StoryGroup title="States">
          <LabeledCheckbox>Unchecked</LabeledCheckbox>
          <LabeledCheckbox defaultChecked>Checked</LabeledCheckbox>
          <LabeledCheckbox indeterminate>Indeterminate</LabeledCheckbox>
          <LabeledCheckbox disabled>Disabled</LabeledCheckbox>
          <LabeledCheckbox defaultChecked disabled>
            Disabled checked
          </LabeledCheckbox>
          <LabeledCheckbox aria-invalid>Invalid</LabeledCheckbox>
        </StoryGroup>
      </StoryFrame>
    )
  },
}

export const Controlled: Story = {
  render: function RenderControlled() {
    const [checked, setChecked] = useState(false)

    return (
      <StoryFrame>
        <LabeledCheckbox
          checked={checked}
          onCheckedChange={(nextChecked) => setChecked(nextChecked)}
        >
          {checked ? 'Notifications enabled' : 'Notifications disabled'}
        </LabeledCheckbox>
      </StoryFrame>
    )
  },
}
