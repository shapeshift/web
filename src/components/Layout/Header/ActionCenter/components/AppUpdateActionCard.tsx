import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  Collapse,
  Flex,
  HStack,
  Icon,
  Image,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import UpdateIcon from '@/assets/update-icon.svg'
import { RawText } from '@/components/Text'
import { Text } from '@/components/Text/Text'
import type { AppUpdateAction } from '@/state/slices/actionSlice/types'

dayjs.extend(relativeTime)

const hoverProps = {
  bg: 'background.button.secondary.hover',
  cursor: 'pointer',
  textDecoration: 'none',
}

type AppUpdateActionCardProps = {
  action: AppUpdateAction
}

export const AppUpdateActionCard = ({ action }: AppUpdateActionCardProps) => {
  const translate = useTranslate()

  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true })

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

  const handleUpdate = useCallback(() => {
    window.location.reload()
  }, [])

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
        <Image src={UpdateIcon} />
        <Stack spacing={0} width='full'>
          <HStack onClick={onToggle}>
            <Stack spacing={1} width='full'>
              <Text fontSize='sm' translation='updateToast.body' />
              <RawText fontSize='sm' color='text.subtle'>
                {formattedDate}
              </RawText>
            </Stack>
            <Icon
              as={isOpen ? ChevronUpIcon : ChevronDownIcon}
              ml='auto'
              my='auto'
              fontSize='xl'
              color='text.subtle'
            />
          </HStack>
          <Collapse in={isOpen}>
            <Card bg='transparent' mt={4}>
              <CardBody px={0} py={0}>
                <Button size='sm' onClick={handleUpdate} width='full'>
                  {translate('updateToast.cta')}
                </Button>
              </CardBody>
            </Card>
          </Collapse>
        </Stack>
      </Flex>
    </Stack>
  )
}
