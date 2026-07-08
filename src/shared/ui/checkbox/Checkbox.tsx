import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon, MinusIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

type CheckboxProps = CheckboxPrimitive.Root.Props

function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'group/checkbox flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-input bg-input/30 text-primary-foreground shadow-xs transition-[background-color,border-color,color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-invalid:border-destructive data-invalid:ring-[3px] data-invalid:ring-destructive/20 data-readonly:cursor-default dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        keepMounted
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-[opacity,scale] data-unchecked:scale-50 data-unchecked:opacity-0 data-[starting-style]:scale-50 data-[starting-style]:opacity-0 data-[ending-style]:scale-50 data-[ending-style]:opacity-0 data-indeterminate:[&_[data-slot=checkbox-check-icon]]:hidden data-indeterminate:[&_[data-slot=checkbox-minus-icon]]:block"
      >
        <CheckIcon
          aria-hidden="true"
          className="size-3.5"
          data-slot="checkbox-check-icon"
          strokeWidth={3}
        />
        <MinusIcon
          aria-hidden="true"
          className="hidden size-3.5"
          data-slot="checkbox-minus-icon"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
