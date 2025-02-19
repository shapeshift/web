import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { knownChainIds } from 'constants/chains'
import type { Property } from 'csstype'
import { useState } from 'react'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { useQuery } from 'hooks/useQuery/useQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectWalletConnectedChainIdsSorted } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { GlobalFilter } from './GlobalFilter'
import type { PositionTableProps } from './PositionTable'
import { PositionTable } from './PositionTable'

type DefiEarnProps = {
  positionTableProps?: Omit<PositionTableProps, 'searchQuery'>
  includeEarnBalances?: boolean
  includeRewardsBalances?: boolean
  header?: JSX.Element
} & FlexProps

const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexPaddingX = { base: 4, xl: 0 }
const flexPropsMd1 = { base: '1 0 auto', md: 1 }
const globalFilterFlexMaxWidth = { base: '100%', md: '300px' }

export const DeFiEarn: React.FC<DefiEarnProps> = ({
  positionTableProps,
  includeEarnBalances,
  includeRewardsBalances,
  header,
  ...rest
}) => {
  const { isConnected } = useWallet().state
  const { q } = useQuery<{ q?: string }>()
  const [searchQuery, setSearchQuery] = useState(q ?? '')
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>()
  const chainIds = useAppSelector(state =>
    isConnected ? selectWalletConnectedChainIdsSorted(state) : knownChainIds,
  )

  return (
    <Flex width='full' flexDir='column' gap={6}>
      {header && header}
      <Flex
        justifyContent='space-between'
        alignItems='center'
        gap={4}
        flexWrap='wrap'
        flexDir={flexDir}
        px={flexPaddingX}
        {...rest}
      >
        <Flex flex={flexPropsMd1} />
        <ChainDropdown
          chainIds={chainIds}
          chainId={selectedChainId}
          onClick={setSelectedChainId}
          showAll
          includeBalance
        />
        <Flex flex={1} maxWidth={globalFilterFlexMaxWidth} width='full' gap={4}>
          <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
        </Flex>
      </Flex>
      <PositionTable
        chainId={selectedChainId}
        searchQuery={searchQuery}
        includeEarnBalances={Boolean(includeEarnBalances)}
        includeRewardsBalances={Boolean(includeRewardsBalances)}
      />
    </Flex>
  )
}
