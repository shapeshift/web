import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useAllowance } from 'react-queries/hooks/useAllowance'

type UseIsApprovalRequired = {
  assetId: AssetId
  from: string
  spender: string
  amountCryptoBaseUnit: string
}

export const useIsApprovalRequired = ({
  assetId,
  amountCryptoBaseUnit,
  from,
  spender,
}: Partial<UseIsApprovalRequired>) => {
  const allowanceQueryResult = useAllowance({ assetId, from, spender })

  const allowanceCryptoBaseUnit = useMemo(() => {
    return allowanceQueryResult.data
  }, [allowanceQueryResult.data])

  const isApprovalRequired = useMemo(() => {
    if (!allowanceCryptoBaseUnit || !amountCryptoBaseUnit) return
    return bn(allowanceCryptoBaseUnit).lt(amountCryptoBaseUnit)
  }, [allowanceCryptoBaseUnit, amountCryptoBaseUnit])

  return {
    allowanceQueryResult,
    isApprovalRequired,
  }
}
