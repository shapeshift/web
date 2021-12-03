import { CheckCircleIcon } from '@chakra-ui/icons'
import { ModalBody } from '@chakra-ui/react'
import { ReactNode } from 'react'

import { Text } from '../../../components/Text'

export type SuccessModalProps = {
  headerText: string
  bodyText: string
  children?: ReactNode
}

export const SuccessModal: React.FC<SuccessModalProps> = props => {
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
