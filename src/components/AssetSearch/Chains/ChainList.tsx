import { Button, Grid } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ChainCard } from './ChainCard'

type ChainListProps = {
  activeChain?: ChainId
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => (arg: ChainId | 'All') => void
  chainIds: ChainId[]
}

export const ChainList: React.FC<ChainListProps> = ({ chainIds, activeChain, onClick }) => {
  const translate = useTranslate()
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
      <Button
        size='lg'
        variant='outline'
        isActive={activeChain === 'All'}
        onClick={e => onClick(e)('All')}
      >
        {translate('common.all')}
      </Button>
      {renderChains}
    </Grid>
  )
}
