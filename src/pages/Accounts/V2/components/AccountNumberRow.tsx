import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Button,
  ButtonProps,
  Collapse,
  Flex,
  IconButton,
  ListItem,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import { AccountId, ChainId, fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { NestedList } from 'components/NestedList'
import { RawText } from 'components/Text'
import {
  accountIdToFeeAssetId,
  firstFourLastFour,
  isUtxoAccountId,
  isUtxoChainId,
} from 'state/slices/portfolioSlice/utils'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectPortfolioAssetIdsByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountEntryRow } from './AccountEntryRow'

type AccountRowProps = {
  accountNumber: number
  accountIds: AccountId[]
  chainId: ChainId
} & ButtonProps

type UtxoAccountEntriesProps = {
  accountIds: AccountId[]
  chainId: ChainId
}

const UtxoAccountEntries: React.FC<UtxoAccountEntriesProps> = ({ accountIds, chainId }) => {
  const { assetId } = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const entries = useMemo(
    () =>
      accountIds.map(accountId => (
        <AccountEntryRow key={`${assetId}-${accountId}`} accountId={accountId} assetId={assetId} />
      )),
    [accountIds, assetId],
  )
  return <>{entries}</>
}

type AccountBasedChainEntriesProps = {
  accountId: AccountId
}
const AccountBasedChainEntries: React.FC<AccountBasedChainEntriesProps> = ({ accountId }) => {
  const filter = useMemo(() => ({ assetId: '', accountId }), [accountId])
  const assetIds = useAppSelector(s => selectPortfolioAssetIdsByAccountId(s, filter))
  const entries = useMemo(
    () =>
      assetIds.map(assetId => (
        <AccountEntryRow key={assetId} accountId={accountId} assetId={assetId} />
      )),
    [accountId, assetIds],
  )
  return <>{entries}</>
}

export const AccountNumberRow: React.FC<AccountRowProps> = ({
  accountIds,
  accountNumber,
  chainId,
  ...rest
}) => {
  const { isOpen, onToggle } = useDisclosure()
  const translate = useTranslate()
  const assets = useSelector(selectAssets)
  const accountId = useMemo(() => accountIds[0], [accountIds]) // all accountIds belong to the same chain
  const isUtxoAccount = useMemo(() => isUtxoAccountId(accountId), [accountId])
  const fiatBalance = '123' // selectPortfolioAccountBalanceByAccountNumberAndChainId?
  const feeAsset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const { color } = feeAsset

  const accountEntries = useMemo(
    () =>
      isUtxoAccount ? (
        <UtxoAccountEntries chainId={chainId} accountIds={accountIds} />
      ) : (
        <AccountBasedChainEntries accountId={accountIds[0]} />
      ),
    [accountIds, chainId, isUtxoAccount],
  )

  const title = useMemo(
    () =>
      isUtxoAccount
        ? assets[accountIdToFeeAssetId(accountId)].name
        : firstFourLastFour(fromAccountId(accountId).account),
    [assets, accountId, isUtxoAccount],
  )

  const fontFamily = useMemo(() => (!isUtxoChainId(chainId) ? 'monospace' : ''), [chainId])

  return (
    <ListItem>
      <Flex p={0} flexDir='row' display='flex' gap={2} alignItems='center'>
        <Button
          variant='ghost'
          py={4}
          flex={1}
          height='auto'
          iconSpacing={4}
          leftIcon={
            // space in string interpolation is not a bug - see Chakra UI Avatar docs
            <Avatar bg={`${color}20`} color={color} size='sm' name={`# ${accountNumber}`} />
          }
          {...rest}
        >
          <Stack alignItems='flex-start' spacing={0}>
            <RawText color='var(--chakra-colors-chakra-body-text)' fontFamily={fontFamily}>
              {title}
            </RawText>
            <RawText fontSize='sm' color='gray.500'>
              {translate('accounts.accountNumber', { accountNumber })}
            </RawText>
          </Stack>
          <Stack direction='row' alignItems='center' spacing={6} ml='auto'>
            <Amount.Fiat value={fiatBalance} />
          </Stack>
        </Button>
        <IconButton
          size='sm'
          variant='ghost'
          isActive={isOpen}
          aria-label='Expand Account'
          icon={isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
          onClick={onToggle}
        />
      </Flex>
      <NestedList as={Collapse} in={isOpen} pr={0}>
        <ListItem>{accountEntries}</ListItem>
      </NestedList>
    </ListItem>
  )
}
