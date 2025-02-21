import type { AssetId } from '@shapeshiftmonorepo/caip'
import { bn } from '@shapeshiftmonorepo/chain-adapters'
import { useMemo } from 'react'

import { useAllowance } from '@/react-queries/hooks/useAllowance'

export type UseIsApprovalRequiredProps = {
  assetId?: AssetId
  from?: string
  spender?: string
  amountCryptoBaseUnit?: string
  isDisabled?: boolean
}

export const useIsAllowanceApprovalRequired = ({
  assetId,
  amountCryptoBaseUnit,
  from,
  spender,
  isDisabled,
}: UseIsApprovalRequiredProps) => {
  const allowanceCryptoBaseUnitResult = useAllowance({
    assetId,
    from,
    spender,
    isDisabled,
    isRefetchEnabled: true,
  })

  const isAllowanceApprovalRequired = useMemo(() => {
    if (!allowanceCryptoBaseUnitResult.data || !amountCryptoBaseUnit) return
    return bn(allowanceCryptoBaseUnitResult.data).lt(amountCryptoBaseUnit)
  }, [allowanceCryptoBaseUnitResult, amountCryptoBaseUnit])

  return {
    allowanceCryptoBaseUnitResult,
    isAllowanceApprovalRequired,
  }
}
