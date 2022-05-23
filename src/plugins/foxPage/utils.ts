import { TrimmedDescriptionLength } from './constants'

export const TrimDescriptionWithEllipsis = (description?: string): string => {
  if (!description) return ''

  if (description.length < TrimmedDescriptionLength) return description

  return description.slice(0, TrimmedDescriptionLength).concat('...')
}
