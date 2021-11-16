import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import React from 'react'
import { Text } from 'components/Text'

import { NativeSetupProps } from '../types'

export const NativeStart = ({ history, location }: NativeSetupProps) => (
  <>
    <ModalHeader>
      <Text translation={'walletProvider.shapeShift.nativeStart.header'} />
    </ModalHeader>
    <ModalBody>
      <Text mb={4} color='gray.500' translation={'walletProvider.shapeShift.nativeStart.body'} />
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
          onClick={() => history.push('/native/import', { vault: location.state.vault })}
        >
          <Text translation={'walletProvider.shapeShift.nativeStart.button'} />
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
          onClick={() => history.push('/native/seed', { vault: location.state.vault })}
        >
          <Text translation={'walletProvider.shapeShift.nativeStart.button2'} />
        </Button>
      </Stack>
    </ModalBody>
  </>
)
