import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Circle, Collapse, IconButton, ListItem, Stack, useDisclosure } from '@chakra-ui/react'
import { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { NestedList } from 'components/NestedList'
import { RawText } from 'components/Text'
import {
  selectFeeAssetByChainId,
  selectPortfolioAccountIdsByChainId,
  selectPortfolioFiatBalanceByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountRow } from './AccountRow'

type ChainRowProps = {
  chainId: ChainId
}

export const ChainRow: React.FC<ChainRowProps> = ({ chainId }) => {
  const { isOpen, onToggle } = useDisclosure()
  const history = useHistory()
  const asset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const filter = useMemo(() => ({ chainId }), [chainId])
  const chainFiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByChainId(s, filter))
  const chainAccountIds = useAppSelector(s => selectPortfolioAccountIdsByChainId(s, filter))
  const { color, name } = asset

  const accountRows = useMemo(() => {
    return chainAccountIds.map(accountId => (
      <AccountRow
        key={accountId}
        accountId={accountId}
        onClick={() => history.push(`accounts/${accountId}`)}
      />
    ))
  }, [chainAccountIds, history])

  return (
    <ListItem as={Card} py={4} pl={2} fontWeight='semibold'>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        px={{ base: 2, md: 4 }}
        py={2}
      >
        <Stack direction='row' fontSize='md' alignItems='center' spacing={4}>
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
