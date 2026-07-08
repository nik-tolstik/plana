import { Collapsible as CollapsePrimitive } from '@base-ui/react/collapsible'

import { cn } from '@/shared/lib/utils'

const collapseContentMotion =
  "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out will-change-[height] data-[ending-style]:h-0 data-[starting-style]:h-0 [&[hidden]:not([hidden='until-found'])]:hidden"

function Collapse(props: CollapsePrimitive.Root.Props) {
  return <CollapsePrimitive.Root data-slot="collapse" {...props} />
}

function CollapseTrigger(props: CollapsePrimitive.Trigger.Props) {
  return <CollapsePrimitive.Trigger data-slot="collapse-trigger" {...props} />
}

function CollapseContent({
  className,
  ...props
}: CollapsePrimitive.Panel.Props) {
  return (
    <CollapsePrimitive.Panel
      data-slot="collapse-content"
      className={cn(collapseContentMotion, className)}
      {...props}
    />
  )
}

const CollapsePanel = CollapseContent

export { Collapse, CollapseContent, CollapsePanel, CollapseTrigger }
