import { type AssetId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'

type UseIsApprovalRequired = {
  assetId: AssetId
  from: string
  spender: string
  amountCryptoBaseUnit: string
}

const usdtAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'

export const useIsApprovalRequired = ({
  assetId,
  amountCryptoBaseUnit,
  from,
  spender,
}: Partial<UseIsApprovalRequired>) => {
  const isUsdtApprovalResetEnabled = useFeatureFlag('UsdtApprovalReset')

  const allowanceCryptoBaseUnitResult = useAllowance({ assetId, from, spender })

  const isApprovalRequired = useMemo(() => {
    if (!allowanceCryptoBaseUnitResult.data || !amountCryptoBaseUnit) return
    return bn(allowanceCryptoBaseUnitResult.data).lt(amountCryptoBaseUnit)
  }, [allowanceCryptoBaseUnitResult, amountCryptoBaseUnit])

  const isAllowanceResetRequired = useMemo(() => {
    if (!assetId) return
    if (!allowanceCryptoBaseUnitResult.data) return

    if (fromAssetId(assetId).chainId !== ethChainId) return false
    const hasAllowance = bnOrZero(allowanceCryptoBaseUnitResult.data).gt(0)
    const isUsdt = assetId === usdtAssetId
    return isUsdtApprovalResetEnabled && hasAllowance && isApprovalRequired && isUsdt
  }, [allowanceCryptoBaseUnitResult, assetId, isApprovalRequired, isUsdtApprovalResetEnabled])

  return {
    allowanceCryptoBaseUnitResult,
    isApprovalRequired,
    isAllowanceResetRequired,
  }
}
