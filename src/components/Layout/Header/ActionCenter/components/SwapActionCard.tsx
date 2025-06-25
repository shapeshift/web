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
import { SwapStatus } from '@shapeshiftoss/swapper'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { SwapDetails } from './Details/SwapDetails'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { RawText } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import type { SwapAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

type SwapActionCardProps = {
  action: SwapAction
  isCollapsable?: boolean
}

export const SwapActionCard = ({ action, isCollapsable = false }: SwapActionCardProps) => {
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

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

  const swap = useMemo(() => {
    return swapsById[action.swapMetadata.swapId]
  }, [action, swapsById])

  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: swap?.isStreaming && action.status === ActionStatus.Pending,
  })

  const hoverProps = useMemo(
    () => ({
      bg: isCollapsable ? 'background.button.secondary.hover' : 'transparent',
      cursor: isCollapsable ? 'pointer' : 'default',
      textDecoration: 'none',
    }),
    [isCollapsable],
  )

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      onToggle()
    }
  }, [onToggle, isCollapsable])

  const swapNotificationTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    if (!swap) return

    return {
      sellAmountAndSymbol: (
        <Amount.Crypto
          value={swap.sellAmountCryptoPrecision}
          symbol={swap.sellAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
      buyAmountAndSymbol: (
        <Amount.Crypto
          value={swap.expectedBuyAmountCryptoPrecision}
          symbol={swap.buyAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [swap])

  const title = useMemo(() => {
    if (!swap) return 'notificationCenter.swap.processing'
    if (swap.isStreaming && swap.status === SwapStatus.Pending)
      return 'notificationCenter.swap.streaming'
    if (swap.status === SwapStatus.Success) return 'notificationCenter.swap.complete'
    if (swap.status === SwapStatus.Failed) return 'notificationCenter.swap.failed'

    return 'notificationCenter.swap.processing'
  }, [swap])

  return (
    <Stack
      spacing={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      _hover={hoverProps}
    >
      <Flex gap={4} alignItems='flex-start' px={4} py={4}>
        <AssetIconWithBadge
          assetId={swap?.sellAsset.assetId}
          secondaryAssetId={swap?.buyAsset.assetId}
          size='md'
        >
          <ActionStatusIcon status={action.status} />
        </AssetIconWithBadge>
        <Stack spacing={0} width='full'>
          <HStack onClick={handleClick}>
            <Stack spacing={1} width='full'>
              <Text
                fontSize='sm'
                translation={title}
                components={swapNotificationTranslationComponents}
              />
              <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1}>
                <ActionStatusTag status={action.status} />
                <RawText>{formattedDate}</RawText>
                <RawText>{action.type}</RawText>
                {swap?.swapperName && (
                  <RawText>
                    <HoverTooltip label={swap.swapperName}>
                      <SwapperIcons swapperName={swap.swapperName} swapSource={undefined} />
                    </HoverTooltip>
                  </RawText>
                )}
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
                <SwapDetails txLink={swap?.txLink} swap={swap} />
              </CardBody>
            </Card>
          </Collapse>
        </Stack>
      </Flex>
    </Stack>
  )
}
