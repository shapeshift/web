import { ChevronDownIcon } from '@chakra-ui/icons'
import type { ButtonProps, MenuProps } from '@chakra-ui/react'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Portal,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ChainRow } from './ChainRow'

import { Amount } from '@/components/Amount/Amount'
import { IconCircle } from '@/components/IconCircle'
import { GridIcon } from '@/components/Icons/GridIcon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectPortfolioTotalBalanceByChainIdIncludeStaking } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ChainDropdownProps = {
  chainId?: ChainId
  onClick: (arg: ChainId | undefined) => void
  chainIds: ChainId[]
  showAll?: boolean
  includeBalance?: boolean
  buttonProps?: ButtonProps
} & Omit<MenuProps, 'children'>

const width = { base: 'full', md: 'auto' }

const chevronDownIcon = <ChevronDownIcon />

export const ChainDropdown: React.FC<ChainDropdownProps> = ({
  chainIds: _chainIds,
  chainId,
  onClick,
  showAll,
  includeBalance,
  buttonProps,
  ...menuProps
}) => {
  const fiatBalanceByChainId = useAppSelector(selectPortfolioTotalBalanceByChainIdIncludeStaking)

  const translate = useTranslate()

  const chainIds = useMemo(() => {
    if (!includeBalance) return _chainIds

    return _chainIds.sort((a, b) => {
      const aBalance = bnOrZero(fiatBalanceByChainId[a])
      const bBalance = bnOrZero(fiatBalanceByChainId[b])
      return bBalance.minus(aBalance).toNumber()
    })
  }, [_chainIds, fiatBalanceByChainId, includeBalance])

  // Sum the balances of all chains in the market chain dropdown
  const totalSupportedMarketsBalance = useMemo(() => {
    return chainIds
      .reduce((acc, chainId) => {
        return acc.plus(bnOrZero(fiatBalanceByChainId[chainId]))
      }, bn(0))
      .toString()
  }, [chainIds, fiatBalanceByChainId])

  const renderChains = useMemo(() => {
    return chainIds.map(chainId => (
      <MenuItemOption value={chainId} key={chainId}>
        <ChainRow chainId={chainId} includeBalance={includeBalance} />
      </MenuItemOption>
    ))
  }, [chainIds, includeBalance])

  const onChange = useCallback((value: string | string[]) => onClick(value as ChainId), [onClick])

  return (
    <Menu {...menuProps}>
      <MenuButton width={width} as={Button} rightIcon={chevronDownIcon} {...buttonProps}>
        {chainId ? <ChainRow chainId={chainId} /> : translate('common.allChains')}
      </MenuButton>
      <Portal>
        <MenuList zIndex='popover'>
          <MenuOptionGroup type='radio' value={chainId} onChange={onChange}>
            {showAll && (
              <MenuItemOption value=''>
                <Flex alignItems='center' gap={4}>
                  <IconCircle boxSize='24px'>
                    <GridIcon />
                  </IconCircle>
                  {translate('common.allChains')}
                  <Amount.Fiat ml='auto' value={totalSupportedMarketsBalance} />
                </Flex>
              </MenuItemOption>
            )}
            {renderChains}
          </MenuOptionGroup>
        </MenuList>
      </Portal>
    </Menu>
  )
}
