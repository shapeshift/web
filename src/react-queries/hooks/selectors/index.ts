import type { Result } from '@sniptt/monads'
import { GetAllowanceErr } from 'react-queries/types'

export const selectAllowanceCryptoBaseUnit = (data: Result<string, GetAllowanceErr>) => {
  if (data.isErr()) {
    const error = data.unwrapErr()
    // the error type is a GetAllowanceErr enum so we can handle all cases with exhaustiveness
    // checking to prevent returning the wrong value if we add more error cases
    switch (error) {
      case GetAllowanceErr.IsFeeAsset:
      case GetAllowanceErr.NotEVMChain:
      case GetAllowanceErr.ZeroAddress:
        // TODO(gomes): This was a pain to dig through and figure out what was going on. We should refactor this whole thing to be easier to grasp.
        // i.e we should use errors to handle errors, not happy cases, and similarly, loading states to handle loading states, not undefined cases.
        // No allowance for:
        // - fee assets
        // - non-EVM assets
        // - magic chain-level transfers for which we use 0x0 as a placeholder
        return undefined
      default:
        return error satisfies never
    }
  }

  const allowanceCryptoBaseUnit = data.unwrap()
  return allowanceCryptoBaseUnit
}
