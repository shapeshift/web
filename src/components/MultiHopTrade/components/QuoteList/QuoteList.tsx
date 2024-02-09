import { CardBody, CardHeader, Heading } from '@chakra-ui/react'
import { useCallback } from 'react'
import { Text } from 'components/Text'

import { TradeQuotes } from '../TradeInput/components/TradeQuotes/TradeQuotes'
import { WithBackButton } from '../WithBackButton'

type QuoteListProps = {
  onBack?: () => void
}

export const QuoteList: React.FC<QuoteListProps> = ({ onBack }) => {
  const handleBack = useCallback(() => {
    onBack && onBack()
  }, [onBack])
  return (
    <>
      <CardHeader px={6} pt={4}>
        <WithBackButton handleBack={handleBack}>
          <Heading textAlign='center' fontSize='md'>
            <Text translation='trade.availableQuotes' />
          </Heading>
        </WithBackButton>
      </CardHeader>
      <CardBody px={0} overflowY='auto' height='500px' flex='1 1 auto'>
        <TradeQuotes isLoading={false} />
      </CardBody>
    </>
  )
}
