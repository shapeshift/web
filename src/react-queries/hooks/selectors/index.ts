import type { Result } from '@sniptt/monads'
import { GetAllowanceErr } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/helpers'
import { assertUnreachable } from 'lib/utils'

export const selectAllowanceCryptoBaseUnit = (data: Result<string, GetAllowanceErr>) => {
  if (data?.isErr()) {
    const error = data.unwrapErr()
    // the error type is a GetAllowanceErr enum so we can handle all cases with exhaustiveness
    // checking to prevent returning the wrong value if we add more error cases
    switch (error) {
      case GetAllowanceErr.IsFeeAsset:
      case GetAllowanceErr.NotEVMChain:
        // No allowance for fee assets or non-EVM chains, this should not run, but just in case
        return undefined
      default:
        assertUnreachable(error)
    }
  }

  const allowanceCryptoBaseUnit = data?.unwrap()
  return allowanceCryptoBaseUnit
}
