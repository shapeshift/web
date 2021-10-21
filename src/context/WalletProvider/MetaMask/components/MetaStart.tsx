import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import detectEthereumProvider from '@metamask/detect-provider'

import { Text } from '../../../../components/Text'

declare const window: any

// NOTE: this is pseudo code for testing.  Ultimately will use hdwallet to do much of this
async function connect() {
  if (typeof window.ethereum !== 'undefined') {
    console.log('MetaMask is installed!')
  }

  const handler = () => {
    console.log('MetaMask connected!')
    console.log('Next step: Get account info')
  }

  const ethereum: any = await detectEthereumProvider()

  if (ethereum) {
    console.log('Got MetaMask provider...')
    ethereum.on('connect', handler())
  } else {
    console.log('Please install MetaMask!')
  }
}

export const MetaStart = () => (
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
          onClick={() => connect()}
        >
          <Text translation={'walletProvider.metaMask.button'} />
        </Button>
      </Stack>
    </ModalBody>
  </>
)
