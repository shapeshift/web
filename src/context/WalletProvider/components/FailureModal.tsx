import { NotAllowedIcon } from '@chakra-ui/icons'
import { ModalBody } from '@chakra-ui/react'

import { Text } from '../../../components/Text'

export interface FailureModalProps {
  headerText: string
  bodyText: string
  children?: any
}

export const FailureModal = (props: FailureModalProps) => {
  const isSuccessful = false

  return (
    <>
      <ModalBody textAlign='center' pb={8}>
        <NotAllowedIcon color='red.500' boxSize={20} mb={6} />
        <Text fontSize='lg' fontWeight='bold' translation={props.headerText} />
        {isSuccessful && <Text color='gray.500' translation={props.bodyText} />}
      </ModalBody>
    </>
  )
}
