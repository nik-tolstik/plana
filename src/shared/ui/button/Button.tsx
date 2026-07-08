import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'

import { cn } from '@/shared/lib/utils'

const RIPPLE_DURATION_MS = 650

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        outline:
          'border-border bg-input/30 hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        xs: 'h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*=size-])]:size-3',
        sm: 'h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        lg: 'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-9',
        'icon-xs': 'size-6 [&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type Ripple = {
  id: number
  size: number
  x: number
  y: number
}

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
type ButtonKeyboardEvent = Parameters<NonNullable<ButtonProps['onKeyDown']>>[0]
type ButtonPointerEvent = Parameters<
  NonNullable<ButtonProps['onPointerDown']>
>[0]

function removeRipple(
  id: number,
  setRipples: Dispatch<SetStateAction<Array<Ripple>>>,
) {
  setRipples((currentRipples) =>
    currentRipples.filter((ripple) => ripple.id !== id),
  )
}

function addRipple({
  clientX,
  clientY,
  nextRippleId,
  setRipples,
  target,
  timeoutIds,
}: {
  clientX?: number
  clientY?: number
  nextRippleId: RefObject<number>
  setRipples: Dispatch<SetStateAction<Array<Ripple>>>
  target: HTMLElement
  timeoutIds: RefObject<Array<ReturnType<typeof setTimeout>>>
}) {
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = (clientX ?? rect.left + rect.width / 2) - rect.left - size / 2
  const y = (clientY ?? rect.top + rect.height / 2) - rect.top - size / 2
  const id = nextRippleId.current

  nextRippleId.current += 1

  setRipples((currentRipples) => [...currentRipples, { id, size, x, y }])

  timeoutIds.current.push(
    setTimeout(() => {
      removeRipple(id, setRipples)
    }, RIPPLE_DURATION_MS),
  )
}

function Button({
  children,
  className,
  disabled,
  onKeyDown,
  onPointerDown,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  const [ripples, setRipples] = useState<Array<Ripple>>([])
  const nextRippleId = useRef(0)
  const timeoutIds = useRef<Array<ReturnType<typeof setTimeout>>>([])

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((timeoutId) => clearTimeout(timeoutId))
    }
  }, [])

  function handlePointerDown(event: ButtonPointerEvent) {
    onPointerDown?.(event)

    if (
      disabled ||
      event.defaultPrevented ||
      event.baseUIHandlerPrevented ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return
    }

    addRipple({
      clientX: event.clientX,
      clientY: event.clientY,
      nextRippleId,
      setRipples,
      target: event.currentTarget,
      timeoutIds,
    })
  }

  function handleKeyDown(event: ButtonKeyboardEvent) {
    onKeyDown?.(event)

    if (
      disabled ||
      event.defaultPrevented ||
      event.baseUIHandlerPrevented ||
      event.repeat ||
      (event.key !== 'Enter' && event.key !== ' ')
    ) {
      return
    }

    addRipple({
      nextRippleId,
      setRipples,
      target: event.currentTarget,
      timeoutIds,
    })
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      {...props}
    >
      <span className="relative inline-flex items-center justify-center gap-[inherit]">
        {children}
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        {ripples.map((ripple) => (
          <span
            className="absolute rounded-full bg-current opacity-20 animate-[button-ripple_650ms_ease-out_forwards]"
            key={ripple.id}
            style={{
              height: ripple.size,
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
            }}
          />
        ))}
      </span>
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
