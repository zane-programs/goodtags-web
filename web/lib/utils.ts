import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The theme replaces Tailwind's type, shadow and radius scales with its own names
// (web/styles.css). tailwind-merge has to be told which group each belongs to, or it
// mistakes e.g. `text-body-lg` for a text color and drops it.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            ...['display', 'headline', 'title', 'label', 'body'].flatMap(role =>
              ['lg', 'md', 'sm'].map(size => `${role}-${size}`),
            ),
          ],
        },
      ],
      shadow: [{ shadow: ['level-1', 'level-2', 'level-3'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
