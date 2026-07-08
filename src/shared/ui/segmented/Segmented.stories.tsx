import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CalendarDaysIcon,
  Columns3Icon,
  KanbanSquareIcon,
  ListIcon,
  Rows3Icon,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import {
  Segmented,
  SegmentedItem,
  SegmentedList,
  SegmentedPanel,
} from './Segmented'

const meta = {
  title: 'Shared UI/Segmented',
  component: Segmented,
  parameters: {
    layout: 'centered',
  },
  args: {
    defaultValue: 'list',
  },
} satisfies Meta<typeof Segmented>

export default meta

type Story = StoryObj<typeof meta>
type ViewValue = 'list' | 'board' | 'calendar'
type DensityValue = 'comfortable' | 'compact' | 'dense'

function StoryFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-w-3xl flex-col gap-8 p-8">{children}</div>
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
      {children}
    </section>
  )
}

export const Playground: Story = {
  render: function RenderPlayground(args) {
    return (
      <StoryFrame>
        <Segmented {...args}>
          <SegmentedList>
            <SegmentedItem value="list">
              <ListIcon data-icon="inline-start" />
              List
            </SegmentedItem>
            <SegmentedItem value="board">
              <KanbanSquareIcon data-icon="inline-start" />
              Board
            </SegmentedItem>
            <SegmentedItem value="calendar">
              <CalendarDaysIcon data-icon="inline-start" />
              Calendar
            </SegmentedItem>
          </SegmentedList>
        </Segmented>
      </StoryFrame>
    )
  },
}

export const States: Story = {
  render: function RenderStates() {
    return (
      <StoryFrame>
        <StoryGroup title="Default">
          <Segmented defaultValue="list">
            <SegmentedList>
              <SegmentedItem value="list">List</SegmentedItem>
              <SegmentedItem value="board">Board</SegmentedItem>
              <SegmentedItem value="calendar">Calendar</SegmentedItem>
            </SegmentedList>
          </Segmented>
        </StoryGroup>

        <StoryGroup title="With disabled item">
          <Segmented defaultValue="list">
            <SegmentedList>
              <SegmentedItem value="list">List</SegmentedItem>
              <SegmentedItem value="board">Board</SegmentedItem>
              <SegmentedItem disabled value="calendar">
                Calendar
              </SegmentedItem>
            </SegmentedList>
          </Segmented>
        </StoryGroup>

        <StoryGroup title="Icon only">
          <Segmented defaultValue="columns">
            <SegmentedList>
              <SegmentedItem aria-label="Columns" value="columns">
                <Columns3Icon />
              </SegmentedItem>
              <SegmentedItem aria-label="Rows" value="rows">
                <Rows3Icon />
              </SegmentedItem>
              <SegmentedItem aria-label="List" value="list">
                <ListIcon />
              </SegmentedItem>
            </SegmentedList>
          </Segmented>
        </StoryGroup>
      </StoryFrame>
    )
  },
}

export const Controlled: Story = {
  render: function RenderControlled() {
    const [view, setView] = useState<ViewValue>('list')

    return (
      <StoryFrame>
        <Segmented
          value={view}
          onValueChange={(nextView) => setView(nextView as ViewValue)}
        >
          <SegmentedList>
            <SegmentedItem value="list">
              <ListIcon data-icon="inline-start" />
              List
            </SegmentedItem>
            <SegmentedItem value="board">
              <KanbanSquareIcon data-icon="inline-start" />
              Board
            </SegmentedItem>
            <SegmentedItem value="calendar">
              <CalendarDaysIcon data-icon="inline-start" />
              Calendar
            </SegmentedItem>
          </SegmentedList>
          <SegmentedPanel value="list">
            <div className="w-80 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              Tasks are grouped by due date.
            </div>
          </SegmentedPanel>
          <SegmentedPanel value="board">
            <div className="w-80 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              Tasks are grouped by status.
            </div>
          </SegmentedPanel>
          <SegmentedPanel value="calendar">
            <div className="w-80 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              Tasks are placed on the calendar.
            </div>
          </SegmentedPanel>
        </Segmented>
      </StoryFrame>
    )
  },
}

export const Vertical: Story = {
  render: function RenderVertical() {
    const [density, setDensity] = useState<DensityValue>('comfortable')

    return (
      <StoryFrame>
        <Segmented
          className="items-start"
          orientation="vertical"
          value={density}
          onValueChange={(nextDensity) =>
            setDensity(nextDensity as DensityValue)
          }
        >
          <SegmentedList>
            <SegmentedItem value="comfortable">Comfortable</SegmentedItem>
            <SegmentedItem value="compact">Compact</SegmentedItem>
            <SegmentedItem value="dense">Dense</SegmentedItem>
          </SegmentedList>
        </Segmented>
      </StoryFrame>
    )
  },
}
