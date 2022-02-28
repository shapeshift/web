import { Button } from '@chakra-ui/react'
import { Text } from 'components/Text'

export const DownloadButton = () => (
  <Button colorScheme='blue' variant='ghost-filled'>
    <Text translation='transactionHistory.downloadCSV' />
  </Button>
)
