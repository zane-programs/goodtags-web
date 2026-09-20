import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { mdiCheckboxBlankOutline, mdiCheckboxMarked } from '@mdi/js'
import { cn } from '@/lib/utils'
import { Icon } from './icon'
import { pressable } from './button'

/**
 * The native app renders Paper's Material checkbox on iOS too (Checkbox.Android): a 24px
 * glyph in a 36px circle that dips to 85% scale when toggled.
 */
function Checkbox({
  className,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  // The dip only plays in response to a toggle, never on first paint.
  const [toggled, setToggled] = React.useState(false)
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-toggled={toggled || undefined}
      onCheckedChange={value => {
        setToggled(true)
        onCheckedChange?.(value)
      }}
      className={cn(
        pressable,
        'group/checkbox grid size-9 shrink-0 cursor-pointer place-content-center rounded-full text-on-surface-variant data-[state=checked]:text-primary disabled:text-on-surface-disabled',
        className,
      )}
      {...props}
    >
      <Icon
        path={mdiCheckboxBlankOutline}
        className="col-start-1 row-start-1 group-data-[state=checked]/checkbox:hidden group-data-toggled/checkbox:animate-uncheck"
      />
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="col-start-1 row-start-1 group-data-toggled/checkbox:animate-check"
      >
        <Icon path={mdiCheckboxMarked} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
