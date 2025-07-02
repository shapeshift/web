import { Card, CardBody, Flex, HStack, Stack, Button, Collapse, Icon, useDisclosure } from '@chakra-ui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Flex as ChakraFlex,
} from '@chakra-ui/react'
import { SwapStatus } from '@shapeshiftoss/swapper'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'
import { SwapDetails } from './Details/SwapDetails'
import { GenericTransactionDetails } from './Details/GenericTransactionDetails'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { HoverTooltip } from '@/components/HoverTooltip/HoverTooltip'
import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { RawText } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import { getTxLink } from '@/lib/getTxLink'
import { useAppSelector } from '@/state/store'
import { selectFeeAssetByChainId } from '@/state/slices/assetsSlice/selectors'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

type GenericTransactionActionCardProps = {
  action: GenericTransactionAction
  isCollapsable?: boolean
}

export const GenericTransactionActionCard = ({ action, isCollapsable = false }: GenericTransactionActionCardProps) => {
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
    <Stack spacing={4} mx={2} borderRadius='lg' transitionProperty='common' transitionDuration='fast' _hover={hoverProps}>
      <Flex gap={4} alignItems='flex-start' px={4} py={4} onClick={handleClick}>
        <ActionStatusTag status={action.status} />
        <Stack spacing={0} width='full'>
          <HStack>
            <Stack spacing={1} width='full'>
              <span style={{ fontSize: '1rem', fontWeight: 500 }}>{action.message}</span>
              <HStack fontSize='sm' color='text.subtle'>
                <span>{formattedDate}</span>
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
