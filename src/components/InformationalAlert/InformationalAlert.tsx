import { Alert, Box } from '@chakra-ui/react'
import React from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'

type InformationalAlertProps = {
  translation: string
}

export const InformationalAlert: React.FC<InformationalAlertProps> = ({ translation }) => {
  return (
    <Box p={8}>
      <Alert status='info' variant='subtle' borderRadius='lg' pl={2}>
        <IconCircle boxSize={8} color='blue.300' background='transparent'>
          <FaInfoCircle />
        </IconCircle>
        <Text color='blue.300' translation={translation} fontWeight='semibold' />
      </Alert>
    </Box>
  )
}
