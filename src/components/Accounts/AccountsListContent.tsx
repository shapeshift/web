import { List, Skeleton } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { ChainRow } from '@/pages/Accounts/components/ChainRow'
import {
  selectIsAnyMarketDataApiQueryPending,
  selectIsPortfolioLoading,
  selectWalletConnectedChainIds,
  selectWalletConnectedChainIdsSorted,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AccountsListContentProps = {
  onClose?: () => void
  isSimpleMenu?: boolean
}

export const AccountsListContent: React.FC<AccountsListContentProps> = ({
  onClose,
  isSimpleMenu = false,
}) => {
  const blanks = Array(4).fill(0)
  const loading = useSelector(selectIsPortfolioLoading)
  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()
  const isAnyMarketDataLoading = useAppSelector(selectIsAnyMarketDataApiQueryPending)

  // Don't use user-currency sorting until we're fully loaded - else this will keep on re-rendering forever and will
  // both look janky (lots of reordering) and most importantly, barely usable
  const portfolioChainIdsSortedUserCurrency = useAppSelector(state =>
    isDiscoveringAccounts || isAnyMarketDataLoading
      ? selectWalletConnectedChainIds(state)
      : selectWalletConnectedChainIdsSorted(state),
  )

  const chainRows = useMemo(
    () =>
      portfolioChainIdsSortedUserCurrency.map(chainId => (
        <ChainRow key={chainId} chainId={chainId} isSimpleMenu={isSimpleMenu} onClose={onClose} />
      )),
    [portfolioChainIdsSortedUserCurrency, isSimpleMenu, onClose],
  )

  const blankRows = useMemo(() => {
    return blanks.map((_, index) => (
      <Skeleton key={`chain-${index}`} height='82px' width='full' borderRadius='2xl' />
    ))
  }, [blanks])

  const renderRows = useMemo(() => {
    return loading ? blankRows : chainRows
  }, [blankRows, chainRows, loading])

  return (
    <List ml={0} mt={0} spacing={4}>
      {renderRows}
    </List>
  )
}
