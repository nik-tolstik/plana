import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDownIcon, LoaderCircleIcon, PlusIcon } from 'lucide-react'

import { Button } from './Button'

const variants = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'destructive',
  'link',
] as const

const textSizes = ['xs', 'sm', 'default', 'lg'] as const
const iconSizes = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const

const meta = {
  title: 'Shared UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: variants,
    },
    size: {
      control: 'select',
      options: [...textSizes, ...iconSizes],
    },
    disabled: {
      control: 'boolean',
    },
    children: {
      control: 'text',
    },
  },
  args: {
    children: 'Button',
    size: 'default',
    variant: 'default',
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

function StoryFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-3xl flex-col gap-8 p-8">{children}</div>
}

function StoryGroup({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function ButtonGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

export const Playground: Story = {}

export const Variants: Story = {
  render: function RenderVariants() {
    return (
      <StoryFrame>
        <StoryGroup title="Variants">
          <ButtonGrid>
            {variants.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </ButtonGrid>
        </StoryGroup>
      </StoryFrame>
    )
  },
}

export const Sizes: Story = {
  render: function RenderSizes() {
    return (
      <StoryFrame>
        <StoryGroup title="Text sizes">
          <ButtonGrid>
            {textSizes.map((size) => (
              <Button key={size} size={size}>
                {size}
              </Button>
            ))}
          </ButtonGrid>
        </StoryGroup>

        <StoryGroup title="Icon sizes">
          <ButtonGrid>
            {iconSizes.map((size) => (
              <Button
                aria-label={size}
                key={size}
                size={size}
                variant="outline"
              >
                <PlusIcon />
              </Button>
            ))}
          </ButtonGrid>
        </StoryGroup>
      </StoryFrame>
    )
  },
}

export const States: Story = {
  render: function RenderStates() {
    return (
      <StoryFrame>
        <StoryGroup title="Enabled">
          <ButtonGrid>
            {variants.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </ButtonGrid>
        </StoryGroup>

        <StoryGroup title="Disabled">
          <ButtonGrid>
            {variants.map((variant) => (
              <Button disabled key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </ButtonGrid>
        </StoryGroup>

        <StoryGroup title="Invalid">
          <ButtonGrid>
            {variants.map((variant) => (
              <Button aria-invalid key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </ButtonGrid>
        </StoryGroup>

        <StoryGroup title="Expanded">
          <ButtonGrid>
            {variants.map((variant) => (
              <Button aria-expanded key={variant} variant={variant}>
                {variant}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            ))}
          </ButtonGrid>
        </StoryGroup>

        <StoryGroup title="Loading">
          <ButtonGrid>
            {variants.map((variant) => (
              <Button disabled key={variant} variant={variant}>
                <LoaderCircleIcon
                  aria-hidden="true"
                  className="animate-spin"
                  data-icon="inline-start"
                />
                {variant}
              </Button>
            ))}
          </ButtonGrid>
        </StoryGroup>
      </StoryFrame>
    )
  },
}

export const WithIcons: Story = {
  render: function RenderWithIcons() {
    return (
      <StoryFrame>
        <StoryGroup title="Inline icons">
          <ButtonGrid>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Create
            </Button>
            <Button variant="outline">
              Continue
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
            <Button aria-label="Create" size="icon">
              <PlusIcon />
            </Button>
          </ButtonGrid>
        </StoryGroup>
      </StoryFrame>
    )
  },
}
