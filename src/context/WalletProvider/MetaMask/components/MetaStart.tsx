import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import * as core from '@shapeshiftoss/hdwallet-core'
import * as metaMask from '@shapeshiftoss/hdwallet-metamask'
import React from 'react'
import { RouteComponentProps } from 'react-router-dom'

import { Text } from '../../../../components/Text'
import { ActionTypes } from '../../WalletProvider'

const keyring = new core.Keyring()
let wallet: core.ETHWallet

export interface MetaSetupProps
  extends RouteComponentProps<
    {},
    any // history
  > {
  dispatch: React.Dispatch<ActionTypes>
}

// NOTE: this is pseudo code for testing.
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
    console.log({ hardenedPath, relPath })
    let result = await wallet.ethGetAddress({
      addressNList: hardenedPath.concat(relPath),
      showDisplay: false
    })
    console.log(`Ethereum address: ${result}`)
  } else {
    console.log('wallet does not support ETH')
  }
}

export const MetaStart = ({ history }: MetaSetupProps) => {
  const success = () => {
    history.push('/metamask/success')
  }

  return (
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
          <Button
            variant='ghost-filled'
            colorScheme='blue'
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={<ArrowForwardIcon />}
            onClick={() => success()}
          >
            <Text translation={'walletProvider.metaMask.connectButton'} />
          </Button>
        </Stack>
      </ModalBody>
    </>
  )
}
