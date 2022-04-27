import { Alert, Box } from '@chakra-ui/react'
import React from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'

export const MissingDataMessage: React.FC<{
  tkey:
    | 'assetUnavailable'
    | 'assetErrored'
    | 'priceHistoryLookupErrored'
    | 'priceHistoryUnavailable'
    | 'balanceHistoryErrored'
    | 'balanceHistoryUnavailable'
    | 'loading'
}> = ({ tkey }) => {
  return (
    <Box p={8}>
      <Alert status='info' variant='subtle' borderRadius='lg' pl={2}>
        <IconCircle boxSize={8} color='blue.300' background='transparent'>
          <FaInfoCircle />
        </IconCircle>
        <Text
          color='blue.300'
          translation={`assets.assetDetails.assetHeader.${tkey}`}
          fontWeight='semibold'
        />
      </Alert>
    </Box>
  )
}
