import * as React from 'react'
import { cn } from '@/lib/utils'

/** Paper's flat, dense TextInput: filled surface, square bottom, underline that thickens on focus. */
function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-t-md border-b border-on-surface-variant bg-surface-variant px-4 font-app text-body-lg text-on-surface caret-primary outline-none placeholder:text-on-surface-variant focus:border-b-2 focus:border-primary focus:pb-0 disabled:text-on-surface-disabled',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
