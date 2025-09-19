import { Button, Flex } from '@chakra-ui/react'
import { useCallback } from 'react'

import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const LEDGER_DEVICE_ID = '0001'
const { name, icon: IconComponent } = SUPPORTED_WALLETS[KeyManager.Ledger]

export const LedgerReadOnlyBody = () => {
  const { dispatch } = useWallet()
  const localWallet = useLocalWallet()

  // Restores Ledger in state, with `isconnected` set to false
  // and *without* wallet (we can't keep it between refreshes, as wallet object doesn't serialize)
  const handleConnectReadOnly = useCallback(() => {
    dispatch({
      type: WalletActions.SET_WALLET,
      payload: {
        wallet: null,
        name,
        icon: IconComponent,
        deviceId: LEDGER_DEVICE_ID,
        connectedType: KeyManager.Ledger,
      },
    })
    dispatch({
      type: WalletActions.SET_IS_CONNECTED,
      payload: false,
    })

    localWallet.setLocalWallet({ type: KeyManager.Ledger, deviceId: LEDGER_DEVICE_ID })

    dispatch({
      type: WalletActions.SET_WALLET_MODAL,
      payload: false,
    })
  }, [dispatch, localWallet])
  return (
    <Flex direction='column' alignItems='center' justifyContent='center' height='full' gap={6}>
      <IconComponent boxSize='64px' />
      <Text fontSize='xl' translation='walletProvider.ledger.failure.header' />
      <Text color='gray.500' translation='walletProvider.ledger.failure.body' textAlign='center' />
      <Button maxW='200px' width='100%' colorScheme='blue' onClick={handleConnectReadOnly}>
        <Text translation='walletProvider.ledger.readOnly.button' />
      </Button>
    </Flex>
  )
}
