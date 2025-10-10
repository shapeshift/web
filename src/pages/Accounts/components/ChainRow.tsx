import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Card,
  Center,
  Circle,
  Collapse,
  ListItem,
  Skeleton,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { AccountNumberRow } from './AccountNumberRow'

import { Amount } from '@/components/Amount/Amount'
import { NestedList } from '@/components/NestedList'
import { RawText } from '@/components/Text'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import {
  selectFeeAssetByChainId,
  selectIsAnyMarketDataApiQueryPending,
  selectPortfolioAccountsGroupedByNumberByChainId,
  selectPortfolioTotalChainIdBalanceUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ChainRowProps = {
  chainId: ChainId
  isSimpleMenu?: boolean
  onClose?: () => void
}

const fontSize = { base: 'sm', md: 'md' }
const borderWidth = { base: 0, md: 1 }
const hover = { borderColor: 'border.hover' }
const stackPx = { base: 2, md: 4 }

export const ChainRow: React.FC<ChainRowProps> = ({ chainId, isSimpleMenu = false, onClose }) => {
  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()
  const isAnyMarketDataLoading = useAppSelector(selectIsAnyMarketDataApiQueryPending)
  const { isOpen, onToggle } = useDisclosure()
  const asset = useAppSelector(s => selectFeeAssetByChainId(s, chainId))
  const filter = useMemo(() => ({ chainId }), [chainId])
  const chainUserCurrencyBalance = useAppSelector(s =>
    isDiscoveringAccounts || isAnyMarketDataLoading
      ? undefined
      : selectPortfolioTotalChainIdBalanceUserCurrency(s, filter),
  )
  const accountIdsByAccountNumber = useAppSelector(s =>
    isOpen ? selectPortfolioAccountsGroupedByNumberByChainId(s, filter) : undefined,
  )

  const accountRows = useMemo(() => {
    if (!isOpen) return null
    if (!accountIdsByAccountNumber) return null

    return Object.entries(accountIdsByAccountNumber).map(([accountNumber, accountIds]) => (
      <AccountNumberRow
        key={accountNumber}
        accountNumber={Number(accountNumber)}
        accountIds={accountIds}
        chainId={chainId}
        isSimpleMenu={isSimpleMenu}
        onClose={onClose}
      />
    ))
  }, [accountIdsByAccountNumber, chainId, isOpen, isSimpleMenu, onClose])

  return asset ? (
    <ListItem
      as={Card}
      py={4}
      pl={2}
      variant='elevated'
      fontWeight='semibold'
      transitionProperty='common'
      transitionDuration='normal'
      fontSize={fontSize}
      borderWidth={borderWidth}
      _hover={hover}
    >
      <Stack
        direction='row'
        cursor='pointer'
        justifyContent='space-between'
        alignItems='center'
        px={stackPx}
        data-test='expand-accounts-button'
        onClick={onToggle}
        py={2}
      >
        <Stack direction='row' alignItems='center' spacing={4}>
          <Circle size={8} borderWidth={2} borderColor={asset.networkColor ?? asset.color} />
          <RawText>{asset.networkName ?? asset.name}</RawText>
        </Stack>
        <Stack direction='row' alignItems='center' spacing={6}>
          <Skeleton isLoaded={!!chainUserCurrencyBalance}>
            <Amount.Fiat value={chainUserCurrencyBalance} />
          </Skeleton>
          <Center boxSize='32px'>{isOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}</Center>
        </Stack>
      </Stack>
      <NestedList as={Collapse} in={isOpen}>
        {accountRows}
      </NestedList>
    </ListItem>
  ) : null
}
