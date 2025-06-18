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
import { fromBaseUnit } from '@shapeshiftoss/utils'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { LimitOrderDetails } from './Details/LimitOrderDetails'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { OrderToCancel } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { RawText } from '@/components/Text'
import type { LimitOrderAction } from '@/state/slices/actionSlice/types'

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
  defaultIsOpen = true,
  onCancelOrder,
  order,
  action,
}: NotificationCardProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })
  const { createdAt, status, type } = action
  const translate = useTranslate()

  const formattedDate = useMemo(() => {
    const now = dayjs()
    const notificationDate = dayjs(createdAt)
    const sevenDaysAgo = now.subtract(7, 'day')

    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  }, [createdAt])

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      onToggle()
    }
  }, [isCollapsable, onToggle])

  const title = useMemo(() => {
    const { sellAmountCryptoBaseUnit, buyAmountCryptoBaseUnit, sellAsset, buyAsset } =
      action.limitOrderMetadata

    return translate('notificationCenter.limitOrderTitle', {
      sellAmount: fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision),
      sellSymbol: sellAsset.symbol,
      buyAmount: fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset.precision),
      buySymbol: buyAsset.symbol,
    })
  }, [action, translate])

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
              <RawText fontSize='sm'>{title}</RawText>
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
