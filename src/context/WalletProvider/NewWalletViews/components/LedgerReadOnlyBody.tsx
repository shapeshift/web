import { Button, Flex } from '@chakra-ui/react'
import { useCallback } from 'react'

import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

// Use the same device ID as defined in LedgerRoutes
const LEDGER_DEVICE_ID = '0001'

export const LedgerReadOnlyBody = () => {
  const { dispatch } = useWallet()
  const localWallet = useLocalWallet()
  const { name, icon } = SUPPORTED_WALLETS[KeyManager.Ledger]

  const handleConnectReadOnly = useCallback(() => {
    // Set up wallet state in read-only mode (same logic as refresh case)
    dispatch({
      type: WalletActions.SET_WALLET,
      payload: {
        wallet: null,
        name,
        icon,
        deviceId: LEDGER_DEVICE_ID,
        connectedType: KeyManager.Ledger,
      },
    })
    dispatch({
      type: WalletActions.SET_IS_CONNECTED,
      payload: false,
    })
    // Set local wallet to persist Ledger as selected wallet
    localWallet.setLocalWallet({ type: KeyManager.Ledger, deviceId: LEDGER_DEVICE_ID })
    // Clear modalType to prevent issues with subsequent wallet connections
    dispatch({
      type: WalletActions.SET_CONNECTOR_TYPE,
      payload: { modalType: null, isMipdProvider: false },
    })
    // Close the modal
    dispatch({
      type: WalletActions.SET_WALLET_MODAL,
      payload: false,
    })
  }, [dispatch, name, icon, localWallet])

  const IconComponent = icon
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
