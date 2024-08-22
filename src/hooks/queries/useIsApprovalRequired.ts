import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { usdtAssetId } from 'components/Modals/FiatRamps/config'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectRelatedAssetIdsInclusive } from 'state/slices/related-assets-selectors'
import { useAppSelector } from 'state/store'

type UseIsApprovalRequired = {
  assetId: AssetId
  pubKey: string
  spender: string
  amountCryptoBaseUnit: string
}

export const useIsApprovalRequired = ({
  assetId,
  amountCryptoBaseUnit,
  pubKey,
  spender,
}: Partial<UseIsApprovalRequired>) => {
  const relatedAssetIdsFilter = useMemo(() => ({ assetId: usdtAssetId }), [])
  const usdtAssetIds = useAppSelector(state =>
    selectRelatedAssetIdsInclusive(state, relatedAssetIdsFilter),
  )
  const isUsdtApprovalResetEnabled = useFeatureFlag('UsdtApprovalReset')

  const allowanceCryptoBaseUnitResult = useAllowance({ assetId, pubKey, spender })

  const isApprovalRequired = useMemo(() => {
    if (!allowanceCryptoBaseUnitResult.data || !amountCryptoBaseUnit) return
    return bn(allowanceCryptoBaseUnitResult.data).lt(amountCryptoBaseUnit)
  }, [allowanceCryptoBaseUnitResult, amountCryptoBaseUnit])

  const isAllowanceResetRequired = useMemo(() => {
    if (!allowanceCryptoBaseUnitResult.data) return
    const hasAllowance = bnOrZero(allowanceCryptoBaseUnitResult.data).gt(0)
    const isUsdt = usdtAssetIds.some(_assetId => _assetId === assetId)
    return isUsdtApprovalResetEnabled && hasAllowance && isApprovalRequired && isUsdt
  }, [
    allowanceCryptoBaseUnitResult,
    assetId,
    isApprovalRequired,
    isUsdtApprovalResetEnabled,
    usdtAssetIds,
  ])

  return {
    allowanceCryptoBaseUnitResult,
    isApprovalRequired,
    isAllowanceResetRequired,
  }
}
