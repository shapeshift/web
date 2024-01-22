import { Spinner } from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'

import { TradeQuoteCard } from './components/TradeQuoteCard'

export const FetchingTradeQuote = ({ swapperName }: { swapperName: SwapperName }) => {
  const headerContent = useMemo(() => {
    return <Spinner size='sm' />
  }, [])

  return (
    <TradeQuoteCard
      title={swapperName}
      swapperName={swapperName}
      headerContent={headerContent}
      bodyContent={null}
      isActive={false}
      isActionable={false}
      isDisabled={true}
      isLoading={true}
    />
  )
}
