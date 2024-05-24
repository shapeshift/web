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
  onPairDeviceClick: () => void
  loading: boolean
  isButtonDisabled?: boolean
  error: string | null
  children?: ReactNode
}

const spinner = <Spinner color='white' />

export const ConnectModal: React.FC<ConnectModalProps> = ({
  bodyText,
  buttonText,
  error,
  headerText,
  loading,
  isButtonDisabled,
  onPairDeviceClick: handlePairDeviceClick,
  children,
}) => {
  return (
    <>
      <ModalHeader>
        <Text translation={headerText} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='text.subtle' translation={bodyText} />
        {error && (
          <Alert status='info' mb={2}>
            <AlertIcon />
            <AlertDescription>
              <Text translation={error} />
            </AlertDescription>
          </Alert>
        )}
        {loading ? (
          <Button
            width='full'
            colorScheme='blue'
            isLoading
            loadingText='Pairing Wallet'
            spinner={spinner}
            isDisabled={isButtonDisabled || loading}
          >
            <Text translation={buttonText || 'walletProvider.keepKey.connect.button'} />
          </Button>
        ) : (
          <Button
            width='full'
            colorScheme='blue'
            onClick={handlePairDeviceClick}
            isDisabled={isButtonDisabled || loading}
            data-test='wallet-pair-button'
          >
            <Text translation={buttonText || 'walletProvider.keepKey.connect.button'} />
          </Button>
        )}
        {children}
      </ModalBody>
    </>
  )
}
