import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Text } from 'components/Text'

export type RedirectModalProps = {
  headerText: string
  bodyText: string
  buttonText: string
  onClickAction(): () => any
  loading: boolean
  error: string | null
  children?: ReactNode
}

export const RedirectModal: React.FC<RedirectModalProps> = props => {
  return (
    <>
      <ModalHeader>
        <Text translation={props.headerText} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='gray.500' translation={props.bodyText} />
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
      </ModalBody>
    </>
  )
}
