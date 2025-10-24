import { NotAllowedIcon } from '@chakra-ui/icons'
import type { InterpolationOptions } from 'node-polyglot'
import type { ReactNode } from 'react'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { Text } from '@/components/Text'

export type FailureModalProps = {
  headerText: string
  bodyText: string | [string, InterpolationOptions]
  children?: ReactNode
}

export const FailureModal: React.FC<FailureModalProps> = props => {
  const isSuccessful = false

  return (
    <>
      <DialogBody textAlign='center' pb={8}>
        <NotAllowedIcon color='red.500' boxSize={20} mb={6} />
        <Text fontSize='lg' fontWeight='bold' translation={props.headerText} />
        {isSuccessful && <Text color='text.subtle' translation={props.bodyText} />}
      </DialogBody>
    </>
  )
}
