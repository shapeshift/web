import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Button,
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
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { RawText } from '@/components/Text'
import { useActionCenterContext } from '../ActionCenterContext'
import type { RfoxClaimAction } from '@/state/slices/actionSlice/types'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

const hoverProps = {
  bg: 'background.button.secondary.hover',
  cursor: 'pointer',
  textDecoration: 'none',
}

type RfoxClaimActionCardProps = {
  action: RfoxClaimAction
}

export const RfoxClaimActionCard = ({ action }: RfoxClaimActionCardProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { closeDrawer } = useActionCenterContext()

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

  const handleClaimClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent card collapse
      const index = action.id.split('-')[1] // Extract index from composite ID
      closeDrawer() // Close the Action Center drawer
      // TODO(gomes): there may be a better way to do the top-level navigation thing, but that works so...
      navigate('/rfox/claim')
      navigate(`/rfox/claim/${index}/confirm`, {
        state: {
          confirmedQuote: {
            stakingAssetAccountId: action.accountId,
            stakingAssetId: action.assetId,
            // TODO(gomes): this should live in action
            stakingAmountCryptoBaseUnit: '42000000000000000000',
            index,
          },
        },
      })
    },
    [action.id, navigate, closeDrawer],
  )

  return (
    <Stack
      spacing={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      _hover={hoverProps}
    >
      <Flex gap={4} alignItems='flex-start' px={4} py={4} onClick={onToggle}>
        <AssetIconWithBadge assetId={action.assetId} size='md'>
          <ActionStatusIcon status={action.status} />
        </AssetIconWithBadge>
        <Stack spacing={0} width='full'>
          <HStack width='full'>
            <Stack spacing={1} width='full'>
              <RawText fontSize='sm' fontWeight={500} lineHeight='short'>
                {action.message}
              </RawText>
              <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1} align='center'>
                <ActionStatusTag status={action.status} />
                <RawText>{formattedDate}</RawText>
                <RawText>rFOX</RawText>
              </HStack>
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
            <Card bg='transparent' mt={4} boxShadow='none'>
              <CardBody px={0} py={0}>
                <Stack gap={4}>
                  <Button width='full' colorScheme='green' onClick={handleClaimClick}>
                    {translate('notificationCenter.claim')}
                  </Button>
                </Stack>
              </CardBody>
            </Card>
          </Collapse>
        </Stack>
      </Flex>
    </Stack>
  )
}
