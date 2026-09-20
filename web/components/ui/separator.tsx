import * as React from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/** Paper's Divider: a hairline by default (one device pixel), 1px when `bold`. */
function Separator({
  className,
  bold = false,
  decorative = true,
  ...props
}: Omit<React.ComponentProps<typeof SeparatorPrimitive.Root>, 'orientation'> & { bold?: boolean }) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      className={cn(
        'w-full shrink-0 border-outline-variant',
        bold ? 'border-t' : 'border-t-[0.34px]',
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
