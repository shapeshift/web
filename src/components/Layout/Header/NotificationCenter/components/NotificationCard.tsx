import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Collapse, Flex, HStack, Icon, Stack, useDisclosure } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TxStatus } from '@shapeshiftoss/unchained-client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { PropsWithChildren } from 'react'
import { useCallback } from 'react'

import { NotificationDetailsWrapper } from './NotificationDetailsWrapper'
import { NotificationStatusTag } from './NotificationStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { RawText } from '@/components/Text'
import { TransactionTypeIcon } from '@/components/TransactionHistory/TransactionTypeIcon'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

const hoverProps = {
  bg: 'background.button.secondary.hover',
  cursor: 'pointer',
}

type NotificationCardProps = {
  type: string
  assetId: AssetId
  status: TxStatus
  date: number
  title: string
  isCollapsable?: boolean
  defaultIsOpen?: boolean
} & PropsWithChildren

export const NotificationCard = ({
  type,
  assetId,
  status,
  date,
  title,
  children,
  isCollapsable = true,
  defaultIsOpen = false,
}: NotificationCardProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })

  const formattedDate = (() => {
    const now = dayjs()
    const notificationDate = dayjs.unix(date)
    const sevenDaysAgo = now.subtract(7, 'day')

    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  })()

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      onToggle()
    }
  }, [isCollapsable, onToggle])

  return (
    <Stack
      spacing={4}
      px={4}
      py={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      _hover={isCollapsable ? hoverProps : undefined}
    >
      <Flex gap={2} alignItems='flex-start' onClick={handleClick}>
        <AssetIconWithBadge assetId={assetId} size='md'>
          <TransactionTypeIcon type={type} status={status} />
        </AssetIconWithBadge>
        <Stack spacing={1}>
          <RawText fontSize='sm'>{title}</RawText>
          <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1}>
            <NotificationStatusTag status={status} />
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
      </Flex>
      <Collapse in={isOpen}>
        <NotificationDetailsWrapper>{children}</NotificationDetailsWrapper>
      </Collapse>
    </Stack>
  )
}
