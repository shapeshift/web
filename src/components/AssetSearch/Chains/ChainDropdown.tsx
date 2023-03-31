import { ChevronDownIcon } from '@chakra-ui/icons'
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
  activeChain?: ChainId
  onClick: (arg: ChainId | undefined) => void
  chainIds: ChainId[]
}

export const ChainDropdown: React.FC<ChainDropdownProps> = ({ chainIds, activeChain, onClick }) => {
  const totalPortfolioFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)
  const translate = useTranslate()
  const renderChains = useMemo(() => {
    return chainIds.map(chainId => (
      <MenuItemOption value={chainId} key={chainId}>
        <ChainRow chainId={chainId} includeBalance />
      </MenuItemOption>
    ))
  }, [chainIds])

  return (
    <Menu>
      <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
        {activeChain ? <ChainRow chainId={activeChain} /> : translate('common.allChains')}
      </MenuButton>
      <MenuList>
        <MenuOptionGroup
          type='radio'
          value={activeChain}
          onChange={value => onClick(value as ChainId)}
        >
          <MenuItemOption value=''>
            <Flex alignItems='center' gap={4}>
              <IconCircle boxSize='24px'>
                <GridIcon />
              </IconCircle>
              {translate('common.allChains')}
              <Amount.Fiat value={totalPortfolioFiatBalance} />
            </Flex>
          </MenuItemOption>
          {renderChains}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}
