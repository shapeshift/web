import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, HStack, ModalBody, ModalHeader, Stack, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaFile, FaKey } from 'react-icons/fa'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'
import { NativeWalletRoutes } from 'context/WalletProvider/types'

const arrowForwardIcon = <ArrowForwardIcon />

export const NativeImportSelect = ({ history }: RouteComponentProps) => {
  const handleImportKeystoreClick = useCallback(
    () => history.push(NativeWalletRoutes.ImportKeystore),
    [history],
  )
  const handleImportSeedClick = useCallback(
    () => history.push(NativeWalletRoutes.ImportSeed),
    [history],
  )

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.start.selectHeader'} />
      </ModalHeader>
      <ModalBody>
        <Text
          mb={4}
          color='text.subtle'
          translation={'walletProvider.shapeShift.start.selectBody'}
        />
        <Stack mt={6} spacing={4}>
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
                  translation='walletProvider.shapeShift.start.uploadKeystore'
                />
              </VStack>
            </HStack>
          </Button>
        </Stack>
      </ModalBody>
    </>
  )
}
