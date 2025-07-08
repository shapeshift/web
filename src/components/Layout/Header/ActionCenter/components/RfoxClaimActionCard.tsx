import { Button, Stack, useDisclosure } from '@chakra-ui/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useActionCenterContext } from '../ActionCenterContext'
import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { bn } from '@/lib/bignumber/bignumber'
import { RfoxRoute } from '@/pages/RFOX/types'
import type { RfoxClaimAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type RfoxClaimActionCardProps = {
  action: RfoxClaimAction
}

export const RfoxClaimActionCard = ({ action }: RfoxClaimActionCardProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { closeDrawer } = useActionCenterContext()

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, action.rfoxClaimActionMetadata.request.stakingAssetId),
  )

  const formattedDate = useMemo(() => {
    const now = dayjs()
    const notificationDate = dayjs(action.updatedAt)
    const sevenDaysAgo = now.subtract(7, 'day')
    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  }, [action.updatedAt])

  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false })

  const handleClaimClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent card collapse
      e.stopPropagation()
      const index = action.rfoxClaimActionMetadata.request.index

      // Close the drawer as early as possible
      closeDrawer()

      navigate(`${RfoxRoute.Claim}/${index}/confirm`, {
        state: {
          selectedUnstakingRequest: action.rfoxClaimActionMetadata.request,
        },
      })
    },
    [navigate, closeDrawer, action.rfoxClaimActionMetadata.request],
  )

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

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge assetId={action.rfoxClaimActionMetadata.request.stakingAssetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [action.rfoxClaimActionMetadata.request.stakingAssetId, action.status])

  const footer = useMemo(() => {
    return (
      <>
        <ActionStatusTag status={action.status} />
      </>
    )
  }, [action.status])

  return (
    <ActionCard
      type={action.type}
      formattedDate={formattedDate}
      isCollapsable={true}
      isOpen={isOpen}
      onToggle={onToggle}
      description={message}
      icon={icon}
      footer={footer}
    >
      <Stack gap={4}>
        <Button width='full' colorScheme='green' onClick={handleClaimClick}>
          {translate('actionCenter.claim')}
        </Button>
      </Stack>
    </ActionCard>
  )
}
