import { ethChainId, fromAssetId, usdtAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'

import {
  useIsAllowanceApprovalRequired,
  type UseIsApprovalRequiredProps,
} from './useIsAllowanceApprovalRequired'

export const useIsAllowanceResetRequired = ({
  assetId,
  amountCryptoBaseUnit,
  from,
  spender,
  isDisabled,
}: UseIsApprovalRequiredProps) => {
  const isUsdtApprovalResetEnabled = useFeatureFlag('UsdtApprovalReset')

  const { allowanceCryptoBaseUnitResult, isAllowanceApprovalRequired } =
    useIsAllowanceApprovalRequired({
      amountCryptoBaseUnit,
      assetId,
      from,
      spender,
      isDisabled,
    })

  const isAllowanceResetRequired = useMemo(() => {
    if (!assetId) return
    if (!allowanceCryptoBaseUnitResult.data) return

    if (fromAssetId(assetId).chainId !== ethChainId) return false
    const hasAllowance = bnOrZero(allowanceCryptoBaseUnitResult.data).gt(0)
    const isUsdtOnEthereum = assetId === usdtAssetId
    return (
      isUsdtApprovalResetEnabled && hasAllowance && isAllowanceApprovalRequired && isUsdtOnEthereum
    )
  }, [
    allowanceCryptoBaseUnitResult.data,
    assetId,
    isAllowanceApprovalRequired,
    isUsdtApprovalResetEnabled,
  ])

  return {
    isAllowanceResetRequired,
    isLoading: allowanceCryptoBaseUnitResult.isLoading,
  }
}
