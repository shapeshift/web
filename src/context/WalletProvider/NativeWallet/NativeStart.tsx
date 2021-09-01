import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import { RawText } from 'components/Text'
import React from 'react'

import { NativeSetupProps } from './setup'

export const NativeStart = ({ history, location }: NativeSetupProps) => (
  <>
    <ModalHeader>Create or import a wallet</ModalHeader>
    <ModalBody>
      <RawText mb={4} color='gray.500'>
        Would you like to create a new wallet or import an existing one?
      </RawText>
      <Stack my={6} spacing={4}>
        <Button
          variant='ghost-filled'
          colorScheme='blue'
          w='full'
          h='auto'
          px={6}
          py={4}
          justifyContent='space-between'
          rightIcon={<ArrowForwardIcon />}
          onClick={() =>
            history.push('/native/import', { encryptedWallet: location.state.encryptedWallet })
          }
        >
          Import Wallet
        </Button>
        <Button
          variant='ghost-filled'
          colorScheme='blue'
          w='full'
          h='auto'
          px={6}
          py={4}
          justifyContent='space-between'
          rightIcon={<ArrowForwardIcon />}
          onClick={() =>
            history.push('/native/seed', { encryptedWallet: location.state.encryptedWallet })
          }
        >
          Create Wallet
        </Button>
      </Stack>
    </ModalBody>
  </>
)
