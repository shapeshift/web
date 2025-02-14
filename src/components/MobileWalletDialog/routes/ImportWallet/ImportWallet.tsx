import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, HStack, Stack, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaFile, FaKey } from 'react-icons/fa'
import { useHistory } from 'react-router'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

const arrowForwardIcon = <ArrowForwardIcon />

interface ImportWalletProps {
  onClose: () => void
  isDefaultRoute?: boolean
  handleRedirectToHome: () => void
}

export const ImportWallet: React.FC<ImportWalletProps> = ({
  onClose,
  isDefaultRoute,
  handleRedirectToHome,
}) => {
  const history = useHistory()
  const handleImportKeystoreClick = useCallback(
    () => history.push(MobileWalletDialogRoutes.ImportKeystore),
    [history],
  )
  const handleImportSeedClick = useCallback(
    () => history.push(MobileWalletDialogRoutes.ImportSeedPhrase),
    [history],
  )

  const handleGoBack = useCallback(() => {
    if (isDefaultRoute && onClose) {
      onClose()
    } else {
      handleRedirectToHome()
    }
  }, [handleRedirectToHome, isDefaultRoute, onClose])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleGoBack} />
        </DialogHeaderLeft>

        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={2} mb={6} alignItems='flex-start'>
          <Text
            fontSize='2xl'
            fontWeight='bold'
            mb={0}
            translation='walletProvider.shapeShift.start.selectHeader'
          />
          <Text color='text.subtle' translation={'walletProvider.shapeShift.start.selectBody'} />
        </VStack>
        <Stack spacing={4}>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleImportSeedClick}
            data-test='wallet-native-import-button'
          >
            <HStack spacing={4}>
              <FaKey size={20} />
              <VStack spacing={0} align='flex-start'>
                <Text translation={'walletProvider.shapeShift.start.secretRecoveryPhrase'} />
                <Text
                  fontSize='sm'
                  color='gray.500'
                  translation='walletProvider.shapeShift.start.twelveWordSeedPhrase'
                />
              </VStack>
            </HStack>
          </Button>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleImportKeystoreClick}
            data-test='wallet-native-create-button'
          >
            <HStack spacing={4}>
              <FaFile size={20} />
              <VStack spacing={0} align='flex-start'>
                <Text translation={'walletProvider.shapeShift.start.keystore'} />
                <Text
                  fontSize='sm'
                  color='gray.500'
                  translation='walletProvider.shapeShift.start.importKeystore'
                />
              </VStack>
            </HStack>
          </Button>
        </Stack>
      </DialogBody>
      <DialogFooter></DialogFooter>
    </SlideTransition>
  )
}
