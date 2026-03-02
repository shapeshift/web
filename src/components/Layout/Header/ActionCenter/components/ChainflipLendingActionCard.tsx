import { useDisclosure } from '@chakra-ui/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'

import { ActionCard } from './ActionCard'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { formatSmartDate } from '@/lib/utils/time'
import type { ChainflipLendingAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

type ChainflipLendingActionCardProps = {
  action: ChainflipLendingAction
}

export const ChainflipLendingActionCard = ({ action }: ChainflipLendingActionCardProps) => {
  const { chainflipLendingMetadata } = action

  const asset = useAppSelector(state => selectAssetById(state, chainflipLendingMetadata.assetId))

  const formattedDate = useMemo(() => {
    return formatSmartDate(action.updatedAt)
  }, [action.updatedAt])

  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: action.status === ActionStatus.Pending,
  })

  const translationComponents = useMemo((): TextPropTypes['components'] | undefined => {
    if (!asset) return undefined

    return {
      amountAndSymbol: (
        <Amount.Crypto
          value={chainflipLendingMetadata.amountCryptoPrecision}
          symbol={asset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [asset, chainflipLendingMetadata.amountCryptoPrecision])

  const icon = useMemo(() => {
    return (
      <AssetIconWithBadge assetId={chainflipLendingMetadata.assetId} size='md'>
        <ActionStatusIcon status={action.status} />
      </AssetIconWithBadge>
    )
  }, [chainflipLendingMetadata.assetId, action.status])

  const description = useMemo(() => {
    return (
      <Text
        fontSize='sm'
        translation={[
          chainflipLendingMetadata.message,
          {
            amount: chainflipLendingMetadata.amountCryptoPrecision,
            symbol: asset?.symbol,
          },
        ]}
        components={translationComponents}
      />
    )
  }, [
    chainflipLendingMetadata.message,
    chainflipLendingMetadata.amountCryptoPrecision,
    asset?.symbol,
    translationComponents,
  ])

  const footer = useMemo(() => {
    return <ActionStatusTag status={action.status} />
  }, [action.status])

  if (!asset) return null

  return (
    <ActionCard
      type={action.type}
      formattedDate={formattedDate}
      isCollapsable={false}
      isOpen={isOpen}
      onToggle={onToggle}
      footer={footer}
      description={description}
      icon={icon}
    >
      {null}
    </ActionCard>
  )
}
