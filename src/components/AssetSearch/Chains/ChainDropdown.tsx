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
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { GridIcon } from 'components/Icons/GridIcon'
import { selectPortfolioTotalFiatBalanceExcludeEarnDupes } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ChainRow } from './ChainRow'

type ChainDropdownProps = {
  chainId?: ChainId
  onClick: (arg: ChainId | undefined) => void
  chainIds: ChainId[]
  showAll?: boolean
  includeBalance?: boolean
  buttonProps?: ButtonProps
} & Omit<MenuProps, 'children'>

export const ChainDropdown: React.FC<ChainDropdownProps> = ({
  chainIds,
  chainId,
  onClick,
  showAll,
  includeBalance,
  buttonProps,
  ...menuProps
}) => {
  const totalPortfolioFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)
  const translate = useTranslate()
  const renderChains = useMemo(() => {
    return chainIds.map(chainId => (
      <MenuItemOption value={chainId} key={chainId}>
        <ChainRow chainId={chainId} includeBalance={includeBalance} />
      </MenuItemOption>
    ))
  }, [chainIds, includeBalance])

  return (
    <Menu {...menuProps}>
      <MenuButton
        width={{ base: 'full', md: 'auto' }}
        as={Button}
        rightIcon={<ChevronDownIcon />}
        {...buttonProps}
      >
        {chainId ? <ChainRow chainId={chainId} /> : translate('common.allChains')}
      </MenuButton>
      <MenuList zIndex='banner'>
        <MenuOptionGroup type='radio' value={chainId} onChange={value => onClick(value as ChainId)}>
          {showAll && (
            <MenuItemOption value=''>
              <Flex alignItems='center' gap={4}>
                <IconCircle boxSize='24px'>
                  <GridIcon />
                </IconCircle>
                {translate('common.allChains')}
                <Amount.Fiat ml='auto' value={totalPortfolioFiatBalance} />
              </Flex>
            </MenuItemOption>
          )}
          {renderChains}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
