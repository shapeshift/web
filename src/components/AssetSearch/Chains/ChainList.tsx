import { Grid } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

import { ChainCard } from './ChainCard'

type ChainListProps = {
  activeChain?: ChainId
  onClick: (arg: ChainId) => void
}

export const ChainList: React.FC<ChainListProps> = ({ activeChain, onClick }) => {
  const chainIds = Array.from(getChainAdapterManager().keys())
  const renderChains = useMemo(() => {
    return chainIds.map(chainId => (
      <ChainCard
        onClick={onClick}
        isActive={activeChain === chainId}
        chainId={chainId}
        key={chainId}
      />
    ))
  }, [activeChain, chainIds, onClick])
  return (
    <Grid gridTemplateColumns='repeat(auto-fit, minmax(52px, 1fr))' gap={4} px={4} mb={4}>
      {renderChains}
    </Grid>
  )
}
