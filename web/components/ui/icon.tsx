import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Material Design Icons, the glyph family the native app uses through
 * MaterialCommunityIcons. Pass a path from `@mdi/js`; only imported paths are bundled.
 */
export function Icon({
  path,
  size = 24,
  className,
  ...props
}: Omit<SVGProps<SVGSVGElement>, 'path'> & { path: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none shrink-0', className)}
      {...props}
    >
      <path d={path} />
    </svg>
  )
}
