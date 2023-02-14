import { Collapse, Flex } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useState } from 'react'

import { TradeQuote } from './TradeQuote'

type TradeQuotesProps = {
  isOpen?: boolean
  isLoading?: boolean
}

export const TradeQuotes: React.FC<TradeQuotesProps> = ({ isOpen, isLoading }) => {
  const [activeQuote, setActiveQuote] = useState('THORchain')
  return (
    <Collapse in={isOpen}>
      <Flex flexDir='column' gap={2} width='full' px={4} py={2}>
        <TradeQuote
          assetId={foxAssetId}
          isBest
          isActive={activeQuote === 'THORchain'}
          quoteAmountCryptoPrecision='999.9374'
          gasFiatPrice='13.35'
          protocol='THORchain'
          isLoading={isLoading}
          onClick={protocol => setActiveQuote(protocol)}
        />
        <TradeQuote
          assetId={foxAssetId}
          quoteAmountCryptoPrecision='999.9374'
          quoteDifference='-0.08'
          gasFiatPrice='13.35'
          protocol='COW Swap'
          isLoading={isLoading}
          isActive={activeQuote === 'COW Swap'}
          onClick={protocol => setActiveQuote(protocol)}
        />
        <TradeQuote
          assetId={foxAssetId}
          quoteAmountCryptoPrecision='999.9374'
          gasFiatPrice='13.35'
          quoteDifference='-0.59'
          protocol='0x'
          isLoading={isLoading}
          isActive={activeQuote === '0x'}
          onClick={protocol => setActiveQuote(protocol)}
        />
      </Flex>
    </Collapse>
  )
}
