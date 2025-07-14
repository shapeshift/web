import { Button, Link, Stack, useDisclosure } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useActionCenterContext } from '../ActionCenterContext'
import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { bn } from '@/lib/bignumber/bignumber'
import { getTxLink } from '@/lib/getTxLink'
import type {
  GenericTransactionDisplayType,
  RfoxClaimAction,
  TcyClaimAction,
} from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectAssetById, selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type ClaimActionCardProps = {
  action: RfoxClaimAction | TcyClaimAction
  // The asset to be claimed
  claimAssetId: AssetId
  // Mostly a TCY thing - for most opportunities, that will be the same. It basically means "display asset symbol/amount as one asset (claimAssetId) and icon as another (underlyingAssetId)"
  underlyingAssetId: AssetId
  txHash: string | undefined
  onClaimClick: () => void
  amountCryptoPrecision: string
  displayType: GenericTransactionDisplayType
}

export const ClaimActionCard = ({
  underlyingAssetId,
  claimAssetId,
  txHash,
  action,
  onClaimClick,
  amountCryptoPrecision,
  displayType,
}: ClaimActionCardProps) => {
  const { closeDrawer } = useActionCenterContext()
  const translate = useTranslate()

  const claimAsset = useAppSelector(state => selectAssetById(state, claimAssetId))

  const claimFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(claimAssetId).chainId),
  )

  const handleClaimClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent card collapse
      e.stopPropagation()
      // Close the drawer as early as possible
      closeDrawer()

      onClaimClick()
    },
    [onClaimClick, closeDrawer],
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

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge assetId={underlyingAssetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [underlyingAssetId, action.status])

  const footer = useMemo(() => {
    return (
      <>
        <ActionStatusTag status={action.status} />
      </>
    )
  }, [action.status])

  const details = useMemo(() => {
    if (!(claimAsset && claimFeeAsset)) return null

    if (action.status === ActionStatus.ClaimAvailable)
      return (
        <Stack gap={4}>
          <Button width='full' colorScheme='green' onClick={handleClaimClick}>
            {translate('actionCenter.claim')}
          </Button>
        </Stack>
      )

    if (!txHash) return null

    const txLink = getTxLink({
      txId: txHash,
      chainId: claimAsset.chainId,
      defaultExplorerBaseUrl: claimFeeAsset.explorerTxLink,
      address: undefined,
      maybeSafeTx: undefined,
    })

    return (
      <Button width='full' as={Link} isExternal href={txLink}>
        {translate('actionCenter.viewTransaction')}
      </Button>
    )
  }, [txHash, action.status, claimFeeAsset, handleClaimClick, claimAsset, translate])

  const message = useMemo(() => {
    if (!claimAsset) return null

    // Yes, this may round down to 0 during testing if you unstake a fraction of FOX, but for *real* users, this is much better visually
    // and it doesn't matter to be off from something like a penny to $0.1, this by no means is supposed to be the exact amount up to the 18dp
    const amountCryptoHuman = bn(amountCryptoPrecision).toFixed(2)

    switch (action.status) {
      case ActionStatus.ClaimAvailable: {
        return translate('actionCenter.rfox.unstakeReady', {
          amount: amountCryptoHuman,
          symbol: claimAsset.symbol,
        })
      }
      case ActionStatus.Pending: {
        return translate('actionCenter.rfox.unstakeTxPending', {
          amount: amountCryptoHuman,
          symbol: claimAsset.symbol,
        })
      }
      case ActionStatus.Claimed: {
        return translate('actionCenter.rfox.unstakeTxComplete', {
          amount: amountCryptoHuman,
          symbol: claimAsset.symbol,
        })
      }
      default:
        throw new Error(`Unsupported RFOX Claim Action status: ${action.status}`)
    }
  }, [amountCryptoPrecision, action.status, claimAsset, translate])

  return (
    <ActionCard
      type={action.type}
      displayType={displayType}
      formattedDate={formattedDate}
      isCollapsable={true}
      isOpen={isOpen}
      onToggle={onToggle}
      description={message}
      icon={icon}
      footer={footer}
    >
      {details}
    </ActionCard>
  )
}
