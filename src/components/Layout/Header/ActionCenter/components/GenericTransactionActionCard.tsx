import { Card, CardBody, Flex, HStack, Stack, Button } from '@chakra-ui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Collapse,
  Flex as ChakraFlex,
  Icon,
  useDisclosure,
} from '@chakra-ui/react'
import { SwapStatus } from '@shapeshiftoss/swapper'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

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
import type { GenericTransactionAction } from '@/state/slices/actionSlice/types'
import { getTxLink } from '@/lib/getTxLink'
import { useAppSelector } from '@/state/store'
import { selectFeeAssetByChainId } from '@/state/slices/assetsSlice/selectors'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

type GenericTransactionActionCardProps = {
  action: GenericTransactionAction
}

export const GenericTransactionActionCard = ({ action }: GenericTransactionActionCardProps) => {
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

  return (
    <Stack spacing={4} mx={2} borderRadius='lg' transitionProperty='common' transitionDuration='fast'>
      <Flex gap={4} alignItems='flex-start' px={4} py={4}>
        <ActionStatusTag status={action.status} />
        <Stack spacing={0} width='full'>
          <HStack>
            <Stack spacing={1} width='full'>
              <span style={{ fontSize: '1rem', fontWeight: 500 }}>{action.message}</span>
              <HStack fontSize='sm' color='text.subtle'>
                <span>{formattedDate}</span>
              </HStack>
            </Stack>
          </HStack>
        </Stack>
      </Flex>
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
          >
            {translate('notificationCenter.viewTransaction')}
          </Button>
        </CardBody>
      </Card>
    </Stack>
  )
}
