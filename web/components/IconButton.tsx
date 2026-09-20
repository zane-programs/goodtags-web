import type { ComponentProps } from 'react'
import { Button } from './ui/button'
export function IconButton({
  label,
  children,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} {...props}>
      {children}
    </Button>
  )
}
