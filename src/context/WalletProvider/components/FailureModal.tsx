import { NotAllowedIcon } from '@chakra-ui/icons'
import { ModalBody } from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import type { ReactNode } from 'react'
import { Text } from 'components/Text'

export type FailureModalProps = {
  headerText: string
  bodyText: string | [string, InterpolationOptions]
  children?: ReactNode
}

export const FailureModal: React.FC<FailureModalProps> = props => {
  const isSuccessful = false

  return (
    <>
      <ModalBody textAlign='center' pb={8}>
        <NotAllowedIcon color='red.500' boxSize={20} mb={6} />
        <Text fontSize='lg' fontWeight='bold' translation={props.headerText} />
        {isSuccessful && <Text color='text.subtle' translation={props.bodyText} />}
      </ModalBody>
    </>
  )
}
