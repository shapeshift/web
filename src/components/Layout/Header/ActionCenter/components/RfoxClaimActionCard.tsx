import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { ClaimActionCard } from './ClaimActionCard'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { bn } from '@/lib/bignumber/bignumber'
import { RfoxRoute } from '@/pages/RFOX/types'
import type { RfoxClaimAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type RfoxClaimActionCardProps = {
  action: RfoxClaimAction
}

export const RfoxClaimActionCard = ({ action }: RfoxClaimActionCardProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const isRFOXFoxEcosystemPageEnabled = useFeatureFlag('RfoxFoxEcosystemPage')

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, action.rfoxClaimActionMetadata.request.stakingAssetId),
  )

  const handleClaimClick = useCallback(() => {
    const index = action.rfoxClaimActionMetadata.request.index

    if (!isRFOXFoxEcosystemPageEnabled) {
      navigate(`${RfoxRoute.Claim}/${index}/confirm`, {
        state: {
          selectedUnstakingRequest: action.rfoxClaimActionMetadata.request,
        },
      })
    } else {
      navigate(`/fox-ecosystem/${index}/confirm`, {
        state: {
          selectedUnstakingRequest: action.rfoxClaimActionMetadata.request,
        },
      })
    }
  }, [action, navigate, isRFOXFoxEcosystemPageEnabled])

  const message = useMemo(() => {
    if (!stakingAsset) return null

    // Yes, this may round down to 0 during testing if you unstake a fraction of FOX, but for *real* users, this is much better visually
    // and it doesn't matter to be off from something like a penny to $0.1, this by no means is supposed to be the exact amount up to the 18dp
    const amountCryptoHuman = bn(
      action.rfoxClaimActionMetadata.request.amountCryptoPrecision,
    ).toFixed(2)

    switch (action.status) {
      case ActionStatus.ClaimAvailable: {
        return translate('actionCenter.rfox.unstakeReady', {
          amount: amountCryptoHuman,
          symbol: stakingAsset.symbol,
        })
      }
      case ActionStatus.Pending: {
        return translate('actionCenter.rfox.unstakeTxPending', {
          amount: amountCryptoHuman,
          symbol: stakingAsset.symbol,
        })
      }
      case ActionStatus.Claimed: {
        return translate('actionCenter.rfox.unstakeTxComplete', {
          amount: amountCryptoHuman,
          symbol: stakingAsset.symbol,
        })
      }
      default:
        throw new Error(`Unsupported RFOX Claim Action status: ${action.status}`)
    }
  }, [
    action.rfoxClaimActionMetadata.request.amountCryptoPrecision,
    action.status,
    stakingAsset,
    translate,
  ])

  return (
    <ClaimActionCard
      displayType={GenericTransactionDisplayType.RFOX}
      action={action}
      claimAssetId={action.rfoxClaimActionMetadata.request.stakingAssetId}
      underlyingAssetId={action.rfoxClaimActionMetadata.request.stakingAssetId}
      txHash={action.rfoxClaimActionMetadata.txHash}
      onClaimClick={handleClaimClick}
      message={message ?? ''}
    />
  )
}
