import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import * as core from '@shapeshiftoss/hdwallet-core'
import * as metaMask from '@shapeshiftoss/hdwallet-metamask'

import { Text } from '../../../../components/Text'

const keyring = new core.Keyring()

let wallet: core.ETHWallet

// NOTE: this is pseudo code for testing.  Ultimately will use hdwallet to do much of this
async function pair() {
  if (typeof window.ethereum !== 'undefined') {
    console.log('MetaMask is installed!')
  } else {
    console.log('Please install MetaMask')
  }
  const metaMaskAdapter = metaMask.MetaMaskAdapter.useKeyring(keyring)

  wallet = (await metaMaskAdapter.pairDevice()) as core.ETHWallet
  console.log('MetaMask wallet paired')
}

async function getAddress() {
  if (core.supportsETH(wallet)) {
    let { hardenedPath, relPath } = wallet.ethGetAccountPaths({
      coin: 'Ethereum',
      accountIdx: 0
    })[0]
    let result = await wallet.ethGetAddress({
      addressNList: hardenedPath.concat(relPath),
      showDisplay: false
    })
    console.log(`Ethereum address: ${result}`)
  } else {
    console.log('wallet does not support ETH')
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
          onClick={() => pair()}
        >
          <Text translation={'walletProvider.metaMask.pairButton'} />
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
          onClick={() => getAddress()}
        >
          <Text translation={'walletProvider.metaMask.getAddressButton'} />
        </Button>
      </Stack>
    </ModalBody>
  </>
)
