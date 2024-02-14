import { MenuItemOption } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { selectPortfolioTotalBalanceByChainIdIncludeStaking } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ChainDropdownBase, type ChainDropdownBaseProps } from './ChainDropdownBase'
import { ChainRow } from './ChainRow'

type ChainDropdownProps = Omit<ChainDropdownBaseProps, 'chainOptions'>

const ChainRowWithBalance = ({ chainId }: { chainId: ChainId }) => {
  const filter = useMemo(() => ({ chainId }), [chainId])
  const chainFiatBalance = useAppSelector(s =>
    selectPortfolioTotalBalanceByChainIdIncludeStaking(s, filter),
  )

  return <ChainRow chainId={chainId} fiatBalance={chainFiatBalance} />
}

export const ChainDropdown: React.FC<ChainDropdownProps> = ({ chainIds, ...props }) => {
  const chainOptions = useMemo(() => {
    return chainIds.map(chainId => (
      <MenuItemOption value={chainId} key={chainId}>
        <ChainRowWithBalance chainId={chainId} />
      </MenuItemOption>
    ))
  }, [chainIds])

  return <ChainDropdownBase chainOptions={chainOptions} chainIds={chainIds} {...props} />
}
