import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader
} from '@chakra-ui/react'
import { ReactNode, useEffect } from 'react'
import { Text } from 'components/Text'

export type ConnectModalProps = {
  headerText: string
  bodyText: string
  buttonText: string 
  autopair?: boolean | null
  pairDevice(): any
  loading: boolean
  error: string | null
  children?: ReactNode
}

export const ConnectModal: React.FC<ConnectModalProps> = props => {
  useEffect(()=> {
    if (props.autopair) {
      props.pairDevice();
    }
  }, [])
  return (
    <>
      <ModalHeader>
        <Text translation={props.headerText} />
      </ModalHeader>
      <ModalBody>  
        <Text mb={4} color='gray.500' translation={props.bodyText} />
        {!props.autopair && (
        <Button isFullWidth colorScheme='blue' onClick={props.pairDevice} disabled={props.loading}>
          <Text translation={props.buttonText || 'walletProvider.keepKey.connect.button'} />
        </Button>
        )}
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
