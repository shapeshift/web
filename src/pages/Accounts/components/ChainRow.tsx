import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Circle, Collapse, IconButton, ListItem, Stack, useDisclosure } from '@chakra-ui/react'
import type { ChainId } from '@keepkey/caip'
import { useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
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
  const chainFiatBalance = useAppSelector(s =>
    selectPortfolioTotalBalanceByChainIdIncludeStaking(s, filter),
  )
  const accountIdsByAccountNumber = useAppSelector(s =>
    selectPortfolioAccountsGroupedByNumberByChainId(s, filter),
  )

  const { color, name } = asset

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
            ? () => history.push(`accounts/${accountIds[0]}`)
            : undefined
        }
      />
    ))
  }, [accountIdsByAccountNumber, chainId, history])

  return (
    <ListItem as={Card} py={4} pl={2} fontWeight='semibold' fontSize={{ base: 'sm', md: 'md' }}>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        px={{ base: 2, md: 4 }}
        py={2}
      >
        <Stack direction='row' alignItems='center' spacing={4}>
          <Circle size={8} borderWidth={2} borderColor={color} />
          <RawText>{name}</RawText>
        </Stack>
        <Stack direction='row' alignItems='center' spacing={6}>
          <Amount.Fiat value={chainFiatBalance} />
          <IconButton
            size='sm'
            variant='ghost'
            isActive={isOpen}
            aria-label='Expand Accounts'
            data-test='expand-accounts-button'
            onClick={onToggle}
            icon={isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
          />
        </Stack>
      </Stack>
      <NestedList as={Collapse} in={isOpen}>
        {accountRows}
      </NestedList>
    </ListItem>
  )
}
