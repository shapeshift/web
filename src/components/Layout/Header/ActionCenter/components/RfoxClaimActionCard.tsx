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

import { useActionCenterContext } from '../ActionCenterContext'
import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { RawText } from '@/components/Text'
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
      // Prevent card collapse
      e.stopPropagation()
      // id is a composite id of <cooldownExpiry>-<index>
      const index = action.id.split('-')[1]
      // Close the drawer as early as possible
      closeDrawer()
      navigate(`/rfox/claim/${index}/confirm`, {
        state: {
          confirmedQuote: {
            stakingAssetAccountId: action.rfoxClaimActionMetadata.accountId,
            stakingAssetId: action.rfoxClaimActionMetadata.assetId,
            stakingAmountCryptoBaseUnit: action.rfoxClaimActionMetadata.amountCryptoBaseUnit,
            index,
          },
        },
      })
    },
    [
      navigate,
      closeDrawer,
      action.id,
      action.rfoxClaimActionMetadata.accountId,
      action.rfoxClaimActionMetadata.assetId,
      action.rfoxClaimActionMetadata.amountCryptoBaseUnit,
    ],
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
        <AssetIconWithBadge assetId={action.rfoxClaimActionMetadata.assetId} size='md'>
          <ActionStatusIcon status={action.status} />
        </AssetIconWithBadge>
        <Stack spacing={0} width='full'>
          <HStack width='full'>
            <Stack spacing={1} width='full'>
              <RawText fontSize='sm' fontWeight={500} lineHeight='short'>
                {action.rfoxClaimActionMetadata.message}
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
