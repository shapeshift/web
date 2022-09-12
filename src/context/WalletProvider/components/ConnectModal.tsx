import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
  Spinner,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Text } from 'components/Text'

export type ConnectModalProps = {
  headerText: string
  bodyText: string
  buttonText: string
  onPairDeviceClick(): any
  loading: boolean
  error: string | null
  children?: ReactNode
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  bodyText,
  buttonText,
  error,
  headerText,
  loading,
  onPairDeviceClick: handlePairDeviceClick,
}) => {
  return (
    <>
      <ModalHeader>
        <Text translation={headerText} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='gray.500' translation={bodyText} />
        {loading ? (
          <Button
            width='full'
            colorScheme='blue'
            isLoading
            loadingText='Pairing Wallet'
            spinner={<Spinner color='white' />}
            disabled={loading}
          >
            <Text translation={buttonText || 'walletProvider.keepKey.connect.button'} />
          </Button>
        ) : (
          <Button
            width='full'
            colorScheme='blue'
            onClick={handlePairDeviceClick}
            disabled={loading}
            data-test='wallet-pair-button'
          >
            <Text translation={buttonText || 'walletProvider.keepKey.connect.button'} />
          </Button>
        )}
        {error && (
          <Alert status='info' mt={4}>
            <AlertIcon />
            <AlertDescription>
              <Text translation={error} />
            </AlertDescription>
          </Alert>
        )}
      </ModalBody>
    </>
  )
}
