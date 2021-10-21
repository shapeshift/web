import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'

import { Text } from '../../../../components/Text'
import { NativeSetupProps } from '../../NativeWallet/types'

export const MetaStart = ({ history, location }: NativeSetupProps) => (
  <>
    <ModalHeader>
      <Text translation={'walletProvider.metaMask.header'} />
    </ModalHeader>
    <ModalBody>
      <Text mb={4} color='gray.500' translation={'walletProvider.metaMask.header'} />
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
          <Text translation={'walletProvider.metaMask.button'} />
        </Button>
      </Stack>
    </ModalBody>
  </>
)
