import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Card,
  CardBody,
  Collapse,
  Flex,
  HStack,
  Icon,
  Link,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { SwapDetails } from './Details/SwapDetails'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import type { SwapAction } from '@/state/slices/actionSlice/types'
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
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const formattedDate = useMemo(() => {
    const now = dayjs()
    const notificationDate = dayjs(action.createdAt)
    const sevenDaysAgo = now.subtract(7, 'day')

    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  }, [action.createdAt])

  const swap = useMemo(() => {
    return swapsById[action.swapMetadata.swapId]
  }, [action, swapsById])

  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: isCollapsable })

  const hoverProps = useMemo(
    () => ({
      bg: swap?.txLink ? 'background.button.secondary.hover' : 'transparent',
      cursor: swap?.txLink ? 'pointer' : 'default',
      textDecoration: 'none',
    }),
    [swap?.txLink],
  )

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      onToggle()
    }
  }, [onToggle, isCollapsable])

  const title = useMemo(() => {
    return translate('notificationCenter.swapTitle', {
      sellAmountAndSymbol: toCrypto(swap.expectedSellAmountCryptoPrecision, swap.sellAsset.symbol, {
        maximumFractionDigits: 8,
        omitDecimalTrailingZeros: true,
        abbreviated: true,
        truncateLargeNumbers: true,
      }),
      buyAmountAndSymbol: toCrypto(swap.expectedBuyAmountCryptoPrecision, swap.buyAsset.symbol, {
        maximumFractionDigits: 8,
        omitDecimalTrailingZeros: true,
        abbreviated: true,
        truncateLargeNumbers: true,
      }),
    })
  }, [
    swap.expectedSellAmountCryptoPrecision,
    swap.expectedBuyAmountCryptoPrecision,
    swap.sellAsset.symbol,
    swap.buyAsset.symbol,
    translate,
    toCrypto,
  ])

  return (
    <Stack
      spacing={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      as={Link}
      href={swap?.txLink && !swap.isStreaming && !isCollapsable ? swap.txLink : undefined}
      isExternal
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
              <RawText fontSize='sm'>{title}</RawText>
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
            {!isCollapsable && swap.txLink && (
              <Icon as={ExternalLinkIcon} ml='auto' my='auto' fontSize='sm' />
            )}
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
