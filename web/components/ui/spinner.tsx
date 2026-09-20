import { cn } from '@/lib/utils'

const spokes = Array.from({ length: 8 }, (_, i) => i)

/** The iOS system activity indicator that React Native's ActivityIndicator renders. */
function Spinner({
  size = 'large',
  className,
  ...props
}: Omit<React.ComponentProps<'svg'>, 'size'> & { size?: 'small' | 'large' }) {
  return (
    <svg
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      className={cn(
        'animate-activity text-outline',
        size === 'large' ? 'size-[37px]' : 'size-5',
        className,
      )}
      {...props}
    >
      {spokes.map(i => (
        <rect
          key={i}
          x="10.75"
          y="1.5"
          width="2.5"
          height="6.5"
          rx="1.25"
          fill="currentColor"
          opacity={0.25 + (0.75 * i) / 7}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  )
}

export { Spinner }
