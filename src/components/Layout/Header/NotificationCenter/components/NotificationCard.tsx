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
import type { AssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo } from 'react'

import type { NotificationStatus, NotificationType } from '../types'
import { NotificationStatusIcon } from './NotificationStatusIcon'
import { NotificationStatusTag } from './NotificationStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { RawText } from '@/components/Text'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

const hoverProps = {
  bg: 'background.button.secondary.hover',
  cursor: 'pointer',
}

type NotificationCardProps = {
  type: NotificationType
  assetId: AssetId
  secondaryAssetId?: AssetId
  status: NotificationStatus
  date: number
  title: string
  isCollapsable?: boolean
  defaultIsOpen?: boolean
} & PropsWithChildren

export const NotificationCard = ({
  type,
  assetId,
  secondaryAssetId,
  status,
  date,
  title,
  children,
  isCollapsable = true,
  defaultIsOpen = false,
}: NotificationCardProps) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })

  const formattedDate = useMemo(() => {
    const now = dayjs()
    const notificationDate = dayjs.unix(date)
    const sevenDaysAgo = now.subtract(7, 'day')

    if (notificationDate.isAfter(sevenDaysAgo)) {
      return notificationDate.fromNow()
    } else {
      return notificationDate.toDate().toLocaleString()
    }
  }, [date])

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      onToggle()
    }
  }, [isCollapsable, onToggle])

  return (
    <Stack
      spacing={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      _hover={isCollapsable ? hoverProps : undefined}
    >
      <Flex gap={4} alignItems='flex-start' px={4} py={4} onClick={handleClick}>
        <AssetIconWithBadge assetId={assetId} secondaryAssetId={secondaryAssetId} size='md'>
          <NotificationStatusIcon status={status} />
        </AssetIconWithBadge>
        <Stack spacing={0} width='full'>
          <HStack>
            <Stack spacing={1} width='full'>
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
          </HStack>
          <Collapse in={isOpen}>
            <Card bg='transparent' mt={4}>
              <CardBody px={0} py={0}>
                {children}
              </CardBody>
            </Card>
          </Collapse>
        </Stack>
      </Flex>
    </Stack>
  )
}
