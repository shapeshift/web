import {
  Alert,
  AlertIcon,
  Button,
  ModalBody,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'

export const LegacyLoginSuccess = ({ history }: RouteComponentProps) => {
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
          color='gray.500'
          mb={4}
          translation={'walletProvider.shapeShift.legacy.importInformations'}
        />
        <Button colorScheme='blue' isFullWidth size='lg'>
          <Text translation={'walletProvider.shapeShift.legacy.importWallet'} />
        </Button>
      </ModalBody>
    </>
  )
}
