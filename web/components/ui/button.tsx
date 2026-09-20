import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Press feedback mirrors the native app on iOS: no ripple, just an instant underlay of the
 * content color at 12% while pressed (the `after:` layer below).
 */
export const pressable =
  'relative touch-manipulation select-none overflow-hidden outline-none [-webkit-tap-highlight-color:transparent] after:pointer-events-none after:absolute after:inset-0 after:bg-current after:opacity-0 active:after:opacity-12 focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none'

const buttonVariants = cva(
  cn(
    pressable,
    'inline-flex shrink-0 cursor-pointer items-center justify-center font-app whitespace-nowrap',
  ),
  {
    variants: {
      variant: {
        contained:
          'bg-primary text-on-primary disabled:bg-surface-disabled disabled:text-on-surface-disabled',
        tonal:
          'bg-secondary-container text-on-secondary-container disabled:bg-surface-disabled disabled:text-on-surface-disabled',
        outlined:
          'border border-outline bg-surface text-primary disabled:border-surface-disabled disabled:text-on-surface-disabled',
        elevated:
          'bg-elevation-1 text-secondary shadow-level-1 transition-shadow duration-200 active:shadow-level-2 disabled:bg-surface-disabled disabled:text-on-surface-disabled disabled:shadow-none',
        text: 'text-primary disabled:text-on-surface-disabled',
        icon: 'rounded-full text-current disabled:text-on-surface-disabled',
      },
      size: {
        default: 'min-h-10 gap-2 rounded-full px-6 py-2.5 text-body-lg has-[>svg:first-child]:pl-4',
        compact: 'min-h-10 gap-2 rounded-full px-6 text-label-lg has-[>svg:first-child]:pl-4',
        icon: 'size-10',
        'icon-lg': 'size-12',
        'icon-xl': 'size-14',
      },
    },
    defaultVariants: { variant: 'contained', size: 'default' },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/** An icon-only button; `label` is required because there is no visible text. */
function IconButton({
  label,
  size = 'icon',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'variant'> & { label: string }) {
  return <Button variant="icon" size={size} aria-label={label} {...props} />
}

export { Button, IconButton, buttonVariants }
