import {
  Alert,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

export type OnContinue = () => void

type LegacyLoginSuccessProps = {
  onContinue: OnContinue
}

export const LegacyLoginSuccess: React.FC<LegacyLoginSuccessProps> = ({ onContinue }) => {
  const translate = useTranslate()
  const successColor = useColorModeValue('green.500', 'green.200')

  return (
    <>
      <ModalHeader>
        <Alert status='success' color={successColor} fontSize='md' fontWeight='normal'>
          <AlertIcon />
          {translate('walletProvider.shapeShift.legacy.loginSuccess')}
        </Alert>
      </ModalHeader>
      <ModalBody pt={0}>
        <Text
          translation={'walletProvider.shapeShift.legacy.mobileWalletTitle'}
          fontSize='lg'
          fontWeight='bold'
          mb={4}
        />
        <Text
          color='text.subtle'
          mb={4}
          translation={'walletProvider.shapeShift.legacy.importInformations'}
        />
        <Button
          colorScheme='blue'
          width='full'
          size='lg'
          onClick={onContinue}
          data-test='wallet-native-login-import'
        >
          <Text translation={'walletProvider.shapeShift.legacy.importWallet'} />
        </Button>
      </ModalBody>
    </>
  )
}
