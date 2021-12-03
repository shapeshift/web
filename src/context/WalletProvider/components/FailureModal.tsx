import { NotAllowedIcon } from '@chakra-ui/icons'
import { ModalBody } from '@chakra-ui/react'
import { ReactNode } from 'react'

import { Text } from '../../../components/Text'

export type FailureModalProps = {
  headerText: string
  bodyText: string
  children?: ReactNode
}

export const FailureModal: React.FC<FailureModalProps> = props => {
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
