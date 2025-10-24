import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, HStack, Stack, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaFile, FaKey } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { Text } from '@/components/Text'
import { NativeWalletRoutes } from '@/context/WalletProvider/types'

const arrowForwardIcon = <ArrowForwardIcon />

export const NativeImportSelect = () => {
  const navigate = useNavigate()
  const handleImportKeystoreClick = useCallback(
    () => navigate(NativeWalletRoutes.ImportKeystore),
    [navigate],
  )
  const handleImportSeedClick = useCallback(
    () => navigate(NativeWalletRoutes.ImportSeed),
    [navigate],
  )

  return (
    <>
      <DialogBody>
        <Text
          fontWeight='bold'
          mb={6}
          translation={'walletProvider.shapeShift.start.selectHeader'}
        />
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
                  translation='walletProvider.shapeShift.start.importKeystore'
                />
              </VStack>
            </HStack>
          </Button>
        </Stack>
      </DialogBody>
    </>
  )
}
