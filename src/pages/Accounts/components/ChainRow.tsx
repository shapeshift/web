import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Card, Center, Circle, Collapse, ListItem, Stack, useDisclosure } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { NestedList } from 'components/NestedList'
import { RawText } from 'components/Text'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import {
  selectFeeAssetByChainId,
  selectPortfolioAccountsGroupedByNumberByChainId,
  selectPortfolioTotalBalanceByChainIdIncludeStaking,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountNumberRow } from './AccountNumberRow'

type ChainRowProps = {
  chainId: ChainId
}

export const ChainRow: React.FC<ChainRowProps> = ({ chainId }) => {
  const { isOpen, onToggle } = useDisclosure()
  const history = useHistory()
  const asset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const filter = useMemo(() => ({ chainId }), [chainId])
  const chainUserCurrencyBalance = useAppSelector(s =>
    selectPortfolioTotalBalanceByChainIdIncludeStaking(s, filter),
  )
  const accountIdsByAccountNumber = useAppSelector(s =>
    selectPortfolioAccountsGroupedByNumberByChainId(s, filter),
  )

  const accountRows = useMemo(() => {
    return Object.entries(accountIdsByAccountNumber).map(([accountNumber, accountIds]) => (
      <AccountNumberRow
        key={accountNumber}
        accountNumber={Number(accountNumber)}
        accountIds={accountIds}
        chainId={chainId}
        onClick={
          // accountIds is strictly length 1 per accountNumber for account-based chains
          !isUtxoAccountId(accountIds[0])
            ? () => history.push(`/dashboard/accounts/${accountIds[0]}`)
            : undefined
        }
      />
    ))
  }, [accountIdsByAccountNumber, chainId, history])

  return asset ? (
    <ListItem
      as={Card}
      py={4}
      pl={2}
      variant='elevated'
      fontWeight='semibold'
      transitionProperty='common'
      transitionDuration='normal'
      fontSize={{ base: 'sm', md: 'md' }}
      borderWidth={{ base: 0, md: 1 }}
      _hover={{ borderColor: 'border.hover' }}
    >
      <Stack
        direction='row'
        cursor='pointer'
        justifyContent='space-between'
        alignItems='center'
        px={{ base: 2, md: 4 }}
        data-test='expand-accounts-button'
        onClick={onToggle}
        py={2}
      >
        <Stack direction='row' alignItems='center' spacing={4}>
          <Circle size={8} borderWidth={2} borderColor={asset.networkColor ?? asset.color} />
          <RawText>{asset.networkName ?? asset.name}</RawText>
        </Stack>
        <Stack direction='row' alignItems='center' spacing={6}>
          <Amount.Fiat value={chainUserCurrencyBalance} />
          <Center boxSize='32px'>{isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}</Center>
        </Stack>
      </Stack>
      <NestedList as={Collapse} in={isOpen}>
        {accountRows}
      </NestedList>
    </ListItem>
  ) : null
}
