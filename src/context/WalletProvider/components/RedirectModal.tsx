import { Alert, AlertDescription, AlertIcon, Button } from '@chakra-ui/react'
import type { ReactNode } from 'react'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'

export type RedirectModalProps = {
  headerText: string
  bodyText: string
  buttonText: string
  loading: boolean
  error: string | null
  children?: ReactNode
  onClickAction: () => void
}

export const RedirectModal: React.FC<RedirectModalProps> = props => {
  return (
    <>
      <DialogHeader>
        <Text translation={props.headerText} />
      </DialogHeader>
      <DialogBody>
        <Text mb={4} color='text.subtle' translation={props.bodyText} />
        <Button
          width='full'
          colorScheme='blue'
          onClick={props.onClickAction}
          isDisabled={props.loading}
        >
          <Text translation={props.buttonText || 'walletProvider.keepKey.connect.button'} />
        </Button>
        {props.error && (
          <Alert status='info' mt={4}>
            <AlertIcon />
            <AlertDescription>
              <Text translation={props.error} />
            </AlertDescription>
          </Alert>
        )}
      </DialogBody>
    </>
  )
}
