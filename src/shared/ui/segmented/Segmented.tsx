import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type SegmentedProps = TabsPrimitive.Root.Props
type SegmentedListProps = TabsPrimitive.List.Props & {
  indicator?: ReactNode
  showIndicator?: boolean
}
type SegmentedIndicatorProps = TabsPrimitive.Indicator.Props
type SegmentedItemProps = TabsPrimitive.Tab.Props
type SegmentedPanelProps = TabsPrimitive.Panel.Props

function Segmented({
  className,
  orientation = 'horizontal',
  ...props
}: SegmentedProps) {
  return (
    <TabsPrimitive.Root
      data-slot="segmented"
      orientation={orientation}
      className={cn(
        'inline-flex w-fit flex-col data-[orientation=vertical]:flex-row',
        className,
      )}
      {...props}
    />
  )
}

function SegmentedList({
  children,
  className,
  indicator,
  showIndicator = true,
  ...props
}: SegmentedListProps) {
  return (
    <TabsPrimitive.List
      data-slot="segmented-list"
      className={cn(
        'relative isolate inline-flex w-fit items-center gap-0.5 rounded-xl border border-border bg-muted/60 p-0.5 text-muted-foreground shadow-xs data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
        className,
      )}
      {...props}
    >
      {showIndicator ? (indicator ?? <SegmentedIndicator />) : null}
      {children}
    </TabsPrimitive.List>
  )
}

function SegmentedIndicator({
  className,
  renderBeforeHydration = true,
  style,
  ...props
}: SegmentedIndicatorProps) {
  return (
    <TabsPrimitive.Indicator
      data-slot="segmented-indicator"
      renderBeforeHydration={renderBeforeHydration}
      className={cn(
        'absolute top-0 left-0 z-0 h-(--active-tab-height) w-(--active-tab-width) rounded-[calc(var(--radius)-0.25rem)] bg-background shadow-sm ring-1 ring-foreground/5 transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,width,height] dark:ring-foreground/10',
        className,
      )}
      style={{
        transform: 'translate(var(--active-tab-left), var(--active-tab-top))',
        ...style,
      }}
      {...props}
    />
  )
}

function SegmentedItem({ className, ...props }: SegmentedItemProps) {
  return (
    <TabsPrimitive.Tab
      data-slot="segmented-item"
      className={cn(
        "relative z-1 inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-[calc(var(--radius)-0.25rem)] px-3 text-sm font-medium whitespace-nowrap transition-[color,opacity,box-shadow] outline-none select-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-active:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-[orientation=vertical]:justify-start data-[orientation=vertical]:px-2.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function SegmentedPanel({ className, ...props }: SegmentedPanelProps) {
  return (
    <TabsPrimitive.Panel
      data-slot="segmented-panel"
      className={cn(
        'mt-3 outline-none data-[orientation=vertical]:mt-0 data-[orientation=vertical]:ml-3',
        className,
      )}
      {...props}
    />
  )
}

export {
  Segmented,
  SegmentedIndicator,
  SegmentedItem,
  SegmentedList,
  SegmentedPanel,
}
