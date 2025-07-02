import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  Collapse,
  Flex as ChakraFlex,
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
import { useTranslate } from 'react-polyglot'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { GenericTransactionDetails } from './Details/GenericTransactionDetails'
import { SwapDetails } from './Details/SwapDetails'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { RawText } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { getTxLink } from '@/lib/getTxLink'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import { selectFeeAssetByChainId } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

type GenericTransactionActionCardProps = {
  action: GenericTransactionAction
  isCollapsable?: boolean
}

export const GenericTransactionActionCard = ({
  action,
  isCollapsable = false,
}: GenericTransactionActionCardProps) => {
  const translate = useTranslate()
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, action.chainId))

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

  const txLink =
    action.txHash && feeAsset?.explorerTxLink
      ? getTxLink({
          txId: action.txHash,
          chainId: action.chainId,
          defaultExplorerBaseUrl: feeAsset.explorerTxLink,
          address: undefined,
          maybeSafeTx: undefined,
        })
      : undefined

  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false })

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

  return (
    <Stack
      spacing={4}
      mx={2}
      borderRadius='lg'
      transitionProperty='common'
      transitionDuration='fast'
      _hover={hoverProps}
    >
      <Flex gap={4} alignItems='flex-start' px={4} py={4} onClick={handleClick}>
        {action.assetId && (
          <AssetIconWithBadge assetId={action.assetId} size='md'>
            <ActionStatusIcon status={action.status} />
          </AssetIconWithBadge>
        )}
        <Stack spacing={0} width='full'>
          <HStack width='full'>
            <Stack spacing={1} width='full'>
              <RawText fontSize='sm' fontWeight={500} lineHeight='short'>
                {action.message}
              </RawText>
              <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1} align='center'>
                <ActionStatusTag status={action.status} />
                <RawText>{formattedDate}</RawText>
                <RawText>{action.displayType}</RawText>
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
          {isCollapsable && (
            <Collapse in={isOpen}>
              <Card bg='transparent' mt={4} boxShadow='none'>
                <CardBody px={0} py={0}>
                  <GenericTransactionDetails />
                </CardBody>
              </Card>
            </Collapse>
          )}
        </Stack>
      </Flex>
      {!isCollapsable && (
        <Card bg='transparent' mt={0} boxShadow='none'>
          <CardBody px={0} py={0}>
            <Button
              as='a'
              href={txLink}
              target='_blank'
              rel='noopener noreferrer'
              width='full'
              colorScheme='gray'
              variant='solid'
              isDisabled={!txLink}
              size='lg'
            >
              {translate('notificationCenter.viewTransaction')}
            </Button>
          </CardBody>
        </Card>
      )}
    </Stack>
  )
}
