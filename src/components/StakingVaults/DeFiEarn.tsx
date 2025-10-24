import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Box, Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import type { JSX } from 'react'
import { useState } from 'react'

import { GlobalFilter } from './GlobalFilter'
import { useFetchOpportunities } from './hooks/useFetchOpportunities'
import type { PositionTableProps } from './PositionTable'
import { PositionTable } from './PositionTable'

import { ChainDropdown } from '@/components/ChainDropdown/ChainDropdown'
import { knownChainIds } from '@/constants/chains'
import { useQuery } from '@/hooks/useQuery/useQuery'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectWalletConnectedChainIdsSorted } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type DefiEarnProps = {
  positionTableProps?: Omit<PositionTableProps, 'searchQuery'>
  header?: JSX.Element
  forceCompactView?: boolean
} & FlexProps

const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexPaddingX = { base: 2, xl: 0 }
const globalFilterFlexMaxWidth = { base: '100%', md: '300px' }
const tablePx = { base: 0, md: 0 }

export const DeFiEarn: React.FC<DefiEarnProps> = ({
  positionTableProps,
  header,
  forceCompactView,
  ...rest
}) => {
  const { isConnected } = useWallet().state
  const { q } = useQuery<{ q?: string }>()
  const [searchQuery, setSearchQuery] = useState(q ?? '')
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>()
  const chainIds = useAppSelector(state =>
    isConnected ? selectWalletConnectedChainIdsSorted(state) : knownChainIds,
  )

  useFetchOpportunities()

  return (
    <Flex width='full' flexDir='column' gap={6}>
      <Flex
        justifyContent='space-between'
        alignItems='center'
        gap={4}
        flexWrap='wrap'
        flexDir={flexDir}
        px={flexPaddingX}
        {...rest}
      >
        {header && header}
        <Flex alignItems='center' gap={4} px={2}>
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
      </Flex>
      <Box px={tablePx}>
        <PositionTable
          chainId={selectedChainId}
          searchQuery={searchQuery}
          forceCompactView={forceCompactView}
        />
      </Box>
    </Flex>
  )
}
