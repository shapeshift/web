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
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { SwapDetails } from './Details/SwapDetails'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { StreamIcon } from '@/components/Icons/Stream'
import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { RawText } from '@/components/Text'
import type { SwapAction } from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

type SwapActionCardProps = {
  isCollapsable?: boolean
  defaultIsOpen?: boolean
} & SwapAction

export const SwapActionCard = ({
  isCollapsable = true,
  defaultIsOpen = false,
  ...action
}: SwapActionCardProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

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

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      onToggle()
    }
  }, [isCollapsable, onToggle])

  const hoverProps = useMemo(
    () => ({
      bg: 'background.button.secondary.hover',
      cursor: swap?.txLink ? 'pointer' : undefined,
    }),
    [swap?.txLink],
  )

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
          assetId={swap?.sellAsset.assetId}
          secondaryAssetId={swap?.buyAsset.assetId}
          size='md'
        >
          <ActionStatusIcon status={action.status} />
        </AssetIconWithBadge>
        <Stack spacing={0} width='full'>
          <HStack onClick={handleClick}>
            <Stack spacing={1} width='full'>
              <RawText fontSize='sm'>{action.title}</RawText>
              <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1}>
                <ActionStatusTag status={action.status} />
                <RawText>{formattedDate}</RawText>
                <RawText>{action.type}</RawText>
                {swap?.isStreaming ? <StreamIcon color='text.success' /> : null}
                {swap?.swapperName && (
                  <RawText>
                    <HoverTooltip label={swap.swapperName}>
                      <SwapperIcons swapperName={swap.swapperName} swapSource={undefined} />
                    </HoverTooltip>
                  </RawText>
                )}
              </HStack>
            </Stack>
            {isCollapsable && swap?.txLink && (
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
