import { TrimmedDescriptionLength } from './constants'

export const TrimDescriptionWithEllipsis = (description?: string): string => {
  return description ? description.slice(0, TrimmedDescriptionLength).concat('...') : ''
}
