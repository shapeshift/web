import type { Swapper } from '../../types'
import { executeSolanaTransaction } from '../../utils'
import { JUPITER_ERRORS, SolanaLogsError } from './errorPatterns'

export const jupiterSwapper: Swapper = {
  executeSolanaTransaction: async (...args) => {
    try {
      const txid = await executeSolanaTransaction(...args)
      return txid
    } catch (e) {
      if (e instanceof Error) {
        const errorMessage = e.message
        const swapperErrorType = Object.keys(JUPITER_ERRORS).reduce(
          (acc, errorPattern) => {
            if (errorMessage.includes(errorPattern)) {
              acc = JUPITER_ERRORS[errorPattern]
            }

            return acc
          },
          undefined as undefined | string,
        )

        if (swapperErrorType) throw new SolanaLogsError(swapperErrorType)
      }

      throw e
    }
  },
}
