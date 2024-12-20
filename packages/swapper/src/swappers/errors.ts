import { SWAPPER_ERRORS } from './baseErrors'
import { JUPITER_ERRORS } from './JupiterSwapper/errors'

export { SWAPPER_ERRORS }

export const swapperErrors = [...JUPITER_ERRORS]

export const getSwapperErrorKey = (error: string): SWAPPER_ERRORS | null => {
  const matchedError = swapperErrors.find(({ value }) => error.includes(value))
  return matchedError ? matchedError.key : null
}
