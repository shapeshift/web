import { Alert } from '@chakra-ui/react'
import { FaInfoCircle } from 'react-icons/fa'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'

type Props = {}

export function MarketDataUnavailable(props: Props) {
  return (
    <Alert status='info' variant='subtle' borderRadius='lg' pl={2}>
      <IconCircle boxSize={8} color='blue.300' background='transparent'>
        <FaInfoCircle />
      </IconCircle>
      <Text color='blue.300' translation='feedbacks.marketDataUnavailable' fontWeight='semibold' />
    </Alert>
  )
}
