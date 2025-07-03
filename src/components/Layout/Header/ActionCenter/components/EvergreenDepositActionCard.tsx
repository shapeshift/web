import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Button,
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
import { fromAccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'

import { ActionStatusIcon } from './ActionStatusIcon'
import { ActionStatusTag } from './ActionStatusTag'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { RawText } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { getTxLink } from '@/lib/getTxLink'
import { formatSmartDate } from '@/lib/utils/time'
import type { EvergreenDepositAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { foxEthPair } from '@/state/slices/opportunitiesSlice/constants'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

dayjs.extend(relativeTime)

const divider = <RawText color='text.subtle'>•</RawText>

const hoverProps = {
  bg: 'background.button.secondary.hover',
  cursor: 'pointer',
  textDecoration: 'none',
}

type EvergreenDepositActionCardProps = {
  action: EvergreenDepositAction
}

export const EvergreenDepositActionCard = ({ action }: EvergreenDepositActionCardProps) => {
  const formattedDate = useMemo(() => {
    return formatSmartDate(action.updatedAt)
  }, [action.updatedAt])

  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: action.status === ActionStatus.Pending,
  })

  const { lpAsset, depositAmountCryptoPrecision, stakeTxHash, accountId } =
    action.evergreenDepositMetadata

  const feeAsset = useAppSelector(state =>
    selectAssetById(state, lpAsset.chainId === 'eip155:1' ? 'eip155:1/slip44:60' : ''),
  )

  const depositNotificationTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    const contractLink = `${lpAsset.explorerAddressLink}${action.evergreenDepositMetadata.contractAddress}`

    return {
      depositAmountAndSymbol: (
        <Amount.Crypto
          value={depositAmountCryptoPrecision}
          symbol={lpAsset.symbol}
          fontSize='sm'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
      contractAddress: (
        <Link href={contractLink} isExternal fontSize='sm' display='inline' color='text.link'>
          {action.evergreenDepositMetadata.contractAddress.slice(0, 6)}...
        </Link>
      ),
    }
  }, [
    depositAmountCryptoPrecision,
    lpAsset.symbol,
    lpAsset.explorerAddressLink,
    action.evergreenDepositMetadata.contractAddress,
  ])

  const title = useMemo(() => {
    switch (action.status) {
      case ActionStatus.Pending:
        return 'notificationCenter.deposit.pending'
      case ActionStatus.Complete:
        return 'notificationCenter.deposit.complete'
      case ActionStatus.Failed:
        return 'notificationCenter.deposit.failed'
      default:
        return ''
    }
  }, [action.status])

  const txLink = useMemo(() => {
    if (!feeAsset || !stakeTxHash || !accountId) return

    return getTxLink({
      txId: stakeTxHash,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      address: fromAccountId(accountId).account,
      chainId: fromAccountId(accountId).chainId,
      maybeSafeTx: undefined,
    })
  }, [feeAsset, stakeTxHash, accountId])

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
        <AssetIconWithBadge assetId={foxEthPair[0]} secondaryAssetId={foxEthPair[1]} size='md'>
          <ActionStatusIcon status={action.status} />
        </AssetIconWithBadge>
        <Stack spacing={0} width='full'>
          <HStack onClick={onToggle}>
            <Stack spacing={1} width='full'>
              <Text
                fontSize='sm'
                translation={title}
                components={depositNotificationTranslationComponents}
              />
              <HStack fontSize='sm' color='text.subtle' divider={divider} gap={1}>
                <ActionStatusTag status={action.status} />
                <RawText>{formattedDate}</RawText>
                <Text translation='foxPage.foxFarming.title' />
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
            <Card bg='transparent' mt={4}>
              <CardBody px={0} py={0}>
                <Stack spacing={3}>
                  {txLink && (
                    <Button as={Link} href={txLink} isExternal size='sm' width='full'>
                      View Transaction
                    </Button>
                  )}
                </Stack>
              </CardBody>
            </Card>
          </Collapse>
        </Stack>
      </Flex>
    </Stack>
  )
}
