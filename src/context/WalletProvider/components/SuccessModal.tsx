import { CheckCircleIcon } from '@chakra-ui/icons'
import { ModalBody } from '@chakra-ui/react'

import { Text } from '../../../components/Text'

export interface SuccessModalProps {
  headerText: string
  bodyText: string
  children?: any
}

export const SuccessModal = (props: SuccessModalProps) => {
  const isSuccessful = true

  return (
    <>
      <ModalBody textAlign='center' pb={8}>
        <CheckCircleIcon color='green.500' boxSize={20} mb={6} />
        <Text fontSize='lg' fontWeight='bold' translation={props.headerText} />
        {isSuccessful && <Text color='gray.500' translation={props.bodyText} />}
      </ModalBody>
    </>
  )
}
