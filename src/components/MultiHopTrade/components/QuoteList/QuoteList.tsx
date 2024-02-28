import type { CardProps } from '@chakra-ui/react'
import { Card, CardBody, CardHeader, Heading } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Text } from 'components/Text'

import { TradeQuotes } from '../TradeInput/components/TradeQuotes/TradeQuotes'
import { WithBackButton } from '../WithBackButton'

type QuoteListProps = {
  onBack?: () => void
  isLoading: boolean
} & CardProps

export const QuoteList: React.FC<QuoteListProps> = props => {
  const { onBack, isLoading, cardProps } = useMemo(() => {
    const { onBack, isLoading, ...cardProps } = props

    return {
      onBack,
      isLoading,
      cardProps,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props))

  return (
    <Card {...cardProps}>
      <CardHeader px={6} pt={4}>
        <WithBackButton onBack={onBack}>
          <Heading textAlign='center' fontSize='md'>
            <Text translation='trade.availableQuotes' />
          </Heading>
        </WithBackButton>
      </CardHeader>
      <CardBody px={0} overflowY='auto' flex='1 1 auto'>
        <TradeQuotes isLoading={isLoading} onBack={onBack} />
      </CardBody>
    </Card>
  )
}
