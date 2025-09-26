import { Box, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { FiatRampQuoteCard } from './FiatRampQuoteCard'

import banxaLogo from '@/assets/banxa.png'
import CoinbaseLogo from '@/assets/coinbase-logo.svg'
import MtPelerinLogo from '@/assets/mtpelerin.png'
import OnRamperLogo from '@/assets/onramper-logo.svg'

export type PaymentMethod = 'Card' | 'Bank Transfer' | 'Apple Pay' | 'Google Pay' | 'SEPA'

export type RampQuote = {
  id: string
  provider: string
  // @TODO: enum when we wire up things
  providerLogo?: string
  rate: string
  amount: string
  isBestRate?: boolean
  isFastest?: boolean
  isCreditCard?: boolean
  isBankTransfer?: boolean
  isApplePay?: boolean
  isGooglePay?: boolean
  isSepa?: boolean
}

type RampQuotesProps = {
  quotes?: RampQuote[]
  isLoading?: boolean
  onBack?: () => void
}

export const RampQuotes: React.FC<RampQuotesProps> = ({
  quotes = [],
  isLoading = false,
  onBack,
}) => {
  // Mock quotes data for demonstration
  const mockQuotes: RampQuote[] = useMemo(
    () => [
      {
        id: '1',
        provider: 'Banxa',
        providerLogo: banxaLogo,
        rate: '0.127895',
        amount: '0.127895 ETH',
        isCreditCard: true,
        isBankTransfer: true,
        isApplePay: true,
        isGooglePay: true,
        isSepa: true,
        isBestRate: true,
      },
      {
        id: '2',
        provider: 'MtPelerin',
        providerLogo: MtPelerinLogo,
        rate: '0.127660',
        amount: '0.127660 ETH',
        isCreditCard: true,
        isSepa: true,
        isFastest: true,
      },
      {
        id: '3',
        provider: 'OnRamper',
        providerLogo: OnRamperLogo,
        rate: '0.127660',
        amount: '0.127660 ETH',
        isCreditCard: true,
        isSepa: true,
        isFastest: true,
      },
      {
        id: '4',
        provider: 'Coinbase',
        providerLogo: CoinbaseLogo,
        rate: '0.127660',
        amount: '0.127660 ETH',
        isCreditCard: true,
        isSepa: true,
        isFastest: true,
      },
    ],
    [],
  )

  const displayQuotes = quotes.length > 0 ? quotes : mockQuotes

  if (isLoading) {
    return (
      <VStack spacing={4} p={4}>
        {[1, 2].map(i => (
          <Box key={i} w='full' h='120px' bg='gray.100' borderRadius='md' />
        ))}
      </VStack>
    )
  }

  return (
    <VStack spacing={4} p={4} align='stretch'>
      {displayQuotes.map((quote, index) => (
        <FiatRampQuoteCard
          key={quote.id}
          isActive={index === 0}
          isBestRate={quote.isBestRate}
          isFastest={quote.isFastest}
          quote={quote}
          isLoading={isLoading}
          onBack={onBack}
        />
      ))}
    </VStack>
  )
}
