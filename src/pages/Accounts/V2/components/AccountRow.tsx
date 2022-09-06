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
import { Asset } from '@shapeshiftoss/asset-service'
import { AccountId, CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { NestedList } from 'components/NestedList'
import { RawText } from 'components/Text'
import { accountIdToLabel, firstFourLastFour } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectFeeAssetByChainId,
  selectPortfolioAssetIdsByAccountId,
  selectPortfolioFiatBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ChildAssetRow } from './ChildAssetRow'

type AccountRowProps = {
  accountId: AccountId
} & ButtonProps

const makeTitle = (accountId: AccountId, asset: Asset) => {
  /**
   * for UTXO chains, we want the title to be the account type
   * for account-based chains, we want the title to be the asset name
   */
  const { chainNamespace, account } = fromAccountId(accountId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Utxo: {
      return accountIdToLabel(accountId)
    }
    case CHAIN_NAMESPACE.CosmosSdk:
    case CHAIN_NAMESPACE.Evm: {
      return firstFourLastFour(account)
    }
    default: {
      return asset.name
    }
  }
}

export const AccountRow: React.FC<AccountRowProps> = ({ accountId, ...rest }) => {
  const { isOpen, onToggle } = useDisclosure()
  const translate = useTranslate()
  const chainId = useMemo(() => fromAccountId(accountId).chainId, [accountId])
  const filter = useMemo(() => ({ assetId: '', accountId }), [accountId])
  const accountNumber = useAppSelector(s => selectAccountNumberByAccountId(s, filter))
  const assetIds = useAppSelector(s => selectPortfolioAssetIdsByAccountId(s, filter))
  const fiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByFilter(s, filter))
  const feeAsset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const { color } = feeAsset

  const assetRows = useMemo(
    () => assetIds.map(assetId => <ChildAssetRow accountId={accountId} assetId={assetId} />),
    [accountId, assetIds],
  )

  const isUtxoChain = useMemo(
    () => fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Utxo,
    [chainId],
  )

  const fontFamily = useMemo(() => (!isUtxoChain ? 'monospace' : ''), [isUtxoChain])

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
              {makeTitle(accountId, feeAsset)}
            </RawText>
            <RawText fontSize='sm' color='gray.500'>
              {translate('accounts.accountNumber', { accountNumber })}
            </RawText>
          </Stack>
          <Stack direction='row' alignItems='center' spacing={6} ml='auto'>
            <Amount.Fiat value={fiatBalance} />
          </Stack>
        </Button>
        {!isUtxoChain && (
          <IconButton
            size='sm'
            variant='ghost'
            isActive={isOpen}
            aria-label='Expand Account'
            icon={isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
            onClick={onToggle}
          />
        )}
      </Flex>
      <NestedList as={Collapse} in={isOpen} pr={0}>
        <ListItem>{assetRows}</ListItem>
      </NestedList>
    </ListItem>
  )
}
