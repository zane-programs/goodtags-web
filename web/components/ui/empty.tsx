import { cn } from '@/lib/utils'

/** The centered message a native TagList shows when it has no rows. */
function Empty({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty"
      className={cn(
        'px-[30px] pt-[55px] text-center text-body-lg whitespace-pre-line text-on-surface',
        className,
      )}
      {...props}
    />
  )
}

export { Empty }
