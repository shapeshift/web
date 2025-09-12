import { Badge, Box, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

type PaymentMethod = 'Card' | 'Bank Transfer' | 'Apple Pay' | 'Google Pay' | 'SEPA'

type RampQuote = {
  id: string
  provider: string
  providerLogo: string
  rate: string
  amount: string
  fiatAmount: string
  paymentMethods: PaymentMethod[]
  isBestRate?: boolean
  isFastest?: boolean
  processingTime: string
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
  const translate = useTranslate()

  // Mock quotes data for demonstration
  const mockQuotes: RampQuote[] = useMemo(
    () => [
      {
        id: '1',
        provider: 'Provider A',
        providerLogo: '🔵',
        rate: '0.127895',
        amount: '0.127895 ETH',
        fiatAmount: '≈ $100',
        paymentMethods: ['Card', 'Bank Transfer', 'Apple Pay', 'Google Pay'],
        isBestRate: true,
        processingTime: '1-3 days',
      },
      {
        id: '2',
        provider: 'Provider B',
        providerLogo: '🔴',
        rate: '0.127660',
        amount: '0.127660 ETH',
        fiatAmount: '≈ $99.99',
        paymentMethods: ['Card', 'SEPA'],
        isFastest: true,
        processingTime: '1-2 days',
      },
    ],
    [],
  )

  const displayQuotes = quotes.length > 0 ? quotes : mockQuotes

  const getPaymentMethodColor = (method: PaymentMethod): string => {
    switch (method) {
      case 'Card':
        return 'blue'
      case 'Bank Transfer':
        return 'green'
      case 'Apple Pay':
        return 'gray'
      case 'Google Pay':
        return 'purple'
      case 'SEPA':
        return 'orange'
      default:
        return 'gray'
    }
  }

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
      {displayQuotes.map(quote => (
        <Box
          key={quote.id}
          p={4}
          border='1px solid'
          borderColor='border.base'
          borderRadius='lg'
          bg='background.surface.raised.base'
        >
          <VStack spacing={3} align='stretch'>
            {/* Header with provider and badges */}
            <Flex justifyContent='space-between' alignItems='center'>
              <HStack spacing={2}>
                <Text fontSize='lg'>{quote.providerLogo}</Text>
                <Text fontWeight='medium'>{quote.provider}</Text>
              </HStack>
              <HStack spacing={2}>
                {quote.isBestRate && (
                  <Badge colorScheme='green' variant='subtle'>
                    {translate('ramp.bestRate')}
                  </Badge>
                )}
                {quote.isFastest && (
                  <Badge colorScheme='blue' variant='subtle'>
                    {translate('ramp.fastest')}
                  </Badge>
                )}
              </HStack>
            </Flex>

            {/* Rate and amount */}
            <Flex justifyContent='space-between' alignItems='center'>
              <VStack spacing={1} align='start'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('ramp.rate')}
                </Text>
                <Text fontWeight='bold'>{quote.amount}</Text>
              </VStack>
              <VStack spacing={1} align='end'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('ramp.amount')}
                </Text>
                <Text fontWeight='bold'>{quote.fiatAmount}</Text>
              </VStack>
            </Flex>

            {/* Payment methods */}
            <VStack spacing={2} align='stretch'>
              <Text fontSize='sm' color='text.subtle'>
                {translate('ramp.paymentMethods')}
              </Text>
              <HStack spacing={2} wrap='wrap'>
                {quote.paymentMethods.map(method => (
                  <Badge
                    key={method}
                    colorScheme={getPaymentMethodColor(method)}
                    variant='outline'
                    fontSize='xs'
                  >
                    {method}
                  </Badge>
                ))}
              </HStack>
            </VStack>

            {/* Processing time */}
            <Flex justifyContent='space-between' alignItems='center'>
              <Text fontSize='sm' color='text.subtle'>
                {translate('ramp.processingTime')}
              </Text>
              <Text fontSize='sm' fontWeight='medium'>
                {quote.processingTime}
              </Text>
            </Flex>
          </VStack>
        </Box>
      ))}
    </VStack>
  )
}
