import { tcyAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { ClaimActionCard } from './ClaimActionCard'

import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import type { TcyClaimAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type TcyClaimActionCardProps = {
  action: TcyClaimAction
}

export const TcyClaimActionCard = ({ action }: TcyClaimActionCardProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))

  const handleClaimClick = useCallback(() => {
    const claim = action.tcyClaimActionMetadata.claim
    navigate(`/tcy/claim/${claim.l1_address}`, { state: { selectedClaim: claim } })
  }, [navigate, action.tcyClaimActionMetadata.claim])

  const message = useMemo(() => {
    if (!tcyAsset) return null
    const amountCryptoHuman = fromThorBaseUnit(
      action.tcyClaimActionMetadata.claim.amountThorBaseUnit,
    )
    switch (action.status) {
      case ActionStatus.ClaimAvailable:
        return translate('actionCenter.tcy.claimReady', {
          amount: amountCryptoHuman,
          symbol: tcyAsset.symbol,
        })
      case ActionStatus.Pending:
        return translate('actionCenter.tcy.claimTxPending', {
          amount: amountCryptoHuman,
          symbol: tcyAsset.symbol,
        })
      case ActionStatus.Claimed:
        return translate('actionCenter.tcy.claimTxComplete', {
          amount: amountCryptoHuman,
          symbol: tcyAsset.symbol,
        })
      default:
        throw new Error(`Unsupported TCY Claim Action status: ${action.status}`)
    }
  }, [action.tcyClaimActionMetadata.claim.amountThorBaseUnit, action.status, tcyAsset, translate])

  return (
    <ClaimActionCard
      displayType={GenericTransactionDisplayType.TCY}
      action={action}
      claimAssetId={tcyAssetId}
      underlyingAssetId={action.tcyClaimActionMetadata.claim.assetId}
      txHash={action.tcyClaimActionMetadata.txHash}
      onClaimClick={handleClaimClick}
      message={message ?? ''}
    />
  )
}
