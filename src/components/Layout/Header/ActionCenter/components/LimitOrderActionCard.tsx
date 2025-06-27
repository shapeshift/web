import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Card,
  CardBody,
  Collapse,
  Flex,
  HStack,
  Icon,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import type { Order } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { LimitOrderDetails } from './Details/LimitOrderDetails'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { OrderToCancel } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { RawText } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import type { LimitOrderAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

const hoverProps = {
  bg: 'background.button.secondary.hover',
  cursor: 'pointer',
}

type NotificationCardProps = {
  isCollapsable?: boolean
  defaultIsOpen?: boolean
  onCancelOrder: (order: OrderToCancel) => void
  order: Order
  action: LimitOrderAction
}

export const LimitOrderActionCard = ({
  isCollapsable = true,
  defaultIsOpen = false,
  onCancelOrder,
  order,
  action,
}: NotificationCardProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })
  const { updatedAt, status, type } = action

  const formattedDate = useMemo(() => {
    const now = dayjs()
    const notificationDate = dayjs(updatedAt)
    const sevenDaysAgo = now.subtract(7, 'day')

    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  }, [updatedAt])

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      onToggle()
    }
  }, [isCollapsable, onToggle])

  const limitOrderActionTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    if (!action) return

    if (action.status === ActionStatus.Complete) {
      return {
        sellAmountAndSymbol: (
          <Amount.Crypto
            value={action.limitOrderMetadata.executedSellAmountCryptoPrecision}
            symbol={action.limitOrderMetadata.sellAsset.symbol}
            fontSize='sm'
            fontWeight='bold'
            maximumFractionDigits={6}
            omitDecimalTrailingZeros
            display='inline'
          />
        ),
        buyAmountAndSymbol: (
          <Amount.Crypto
            value={action.limitOrderMetadata.executedBuyAmountCryptoPrecision}
            symbol={action.limitOrderMetadata.buyAsset.symbol}
            fontSize='sm'
            fontWeight='bold'
            maximumFractionDigits={6}
            omitDecimalTrailingZeros
            display='inline'
          />
        ),
      }
    }

    return {
      sellAmountAndSymbol: (
        <Amount.Crypto
          value={action.limitOrderMetadata.sellAmountCryptoPrecision}
          symbol={action.limitOrderMetadata.sellAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
      buyAmountAndSymbol: (
        <Amount.Crypto
          value={action.limitOrderMetadata.buyAmountCryptoPrecision}
          symbol={action.limitOrderMetadata.buyAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [action])

  const limitOrderTitleTranslation = useMemo(() => {
    if (!action) return 'notificationCenter.limitOrder.processing'
    if (action.status === ActionStatus.Open) return 'notificationCenter.limitOrder.placed'
    if (action.status === ActionStatus.Complete) return 'notificationCenter.limitOrder.complete'
    if (action.status === ActionStatus.Expired) return 'notificationCenter.limitOrder.expired'
    if (action.status === ActionStatus.Cancelled) return 'notificationCenter.limitOrder.cancelled'

    return 'notificationCenter.limitOrder.placed'
  }, [action])

  return (
    <Stack
      spacing={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      _hover={isCollapsable ? hoverProps : undefined}
    >
      <Flex gap={4} alignItems='flex-start' px={4} py={4}>
        <AssetIconWithBadge
          assetId={action.limitOrderMetadata.buyAsset.assetId}
          secondaryAssetId={action.limitOrderMetadata.sellAsset.assetId}
          size='md'
        >
          <ActionStatusIcon status={status} />
        </AssetIconWithBadge>
        <Stack spacing={0} width='full'>
          <HStack onClick={handleClick}>
            <Stack spacing={1} width='full'>
              <Text
                fontSize='sm'
                translation={limitOrderTitleTranslation}
                components={limitOrderActionTranslationComponents}
              />
              <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1}>
                <ActionStatusTag status={status} />
                <RawText>{formattedDate}</RawText>
                <RawText>{type}</RawText>
              </HStack>
            </Stack>
            {isCollapsable && (
              <Icon
                as={isOpen ? ChevronUpIcon : ChevronDownIcon}
                ml='auto'
                my='auto'
                fontSize='xl'
                color='text.subtle'
              />
            )}
          </HStack>
          <Collapse in={isOpen}>
            <Card bg='transparent' mt={4}>
              <CardBody px={0} py={0}>
                <LimitOrderDetails action={action} order={order} onCancelOrder={onCancelOrder} />
              </CardBody>
            </Card>
          </Collapse>
        </Stack>
      </Flex>
    </Stack>
  )
}
