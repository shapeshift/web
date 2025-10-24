import { Box, Button, Divider, HStack, Stack } from '@chakra-ui/react'
import type EthereumProvider from '@walletconnect/ethereum-provider'
import { useCallback, useState } from 'react'

import { WalletConnectDirectRow } from '../WalletConnectV2/components/WalletConnectDirectRow'

import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { WalletConnectV2Config } from '@/context/WalletProvider/WalletConnectV2/config'
import { WalletNotFoundError } from '@/context/WalletProvider/WalletConnectV2/Error'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isWalletConnectWallet } from '@/lib/utils'
import { clearWalletConnectLocalStorage } from '@/plugins/walletConnectToDapps/utils/clearAllWalletConnectToDappsSessions'

export const WalletConnectTopSection = () => {
  const { dispatch, state, getAdapter } = useWallet()
  const localWallet = useLocalWallet()
  const [loading, setLoading] = useState(false)

  const pairDevice = useCallback(async () => {
    clearWalletConnectLocalStorage()
    setLoading(true)
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })

    const adapter = await getAdapter(KeyManager.WalletConnectV2)

    try {
      if (adapter) {
        if (!state.wallet || !isWalletConnectWallet(state.wallet)) {
          // trigger the web3 modal
          const wallet = await adapter.pairDevice()

          if (!wallet) throw new WalletNotFoundError()

          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
          dispatch({
            type: WalletActions.SET_WCV2_PROVIDER,
            payload: wallet.provider as unknown as EthereumProvider,
          })

          const { name, icon } = WalletConnectV2Config
          const deviceId = await wallet.getDeviceID()

          dispatch({
            type: WalletActions.SET_WALLET,
            payload: { wallet, name, icon, deviceId, connectedType: KeyManager.WalletConnectV2 },
          })
          dispatch({
            type: WalletActions.SET_IS_CONNECTED,
            payload: true,
          })
          localWallet.setLocalWallet({ type: KeyManager.WalletConnectV2, deviceId })
        }
      }
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e: unknown) {
      if (e instanceof WalletNotFoundError) {
        console.error(e)
      } else {
        console.error('WalletConnect pairing failed:', e)
      }
    } finally {
      setLoading(false)
    }
  }, [dispatch, getAdapter, localWallet, state.wallet])

  return (
    <Stack spacing={6} justifyContent='space-between' flex={1}>
      <WalletConnectDirectRow />
      <HStack spacing={4}>
        <Divider borderColor='border.bold' />
        <Stack spacing={0} flexShrink={0} flexGrow={0} textAlign='center'>
          <Text
            fontWeight='bold'
            fontSize='md'
            translation='walletProvider.walletConnect.topSection.dontSeeWallet'
          />
          <Text
            fontSize='sm'
            color='text.subtle'
            translation='walletProvider.walletConnect.topSection.connectToWallets'
          />
        </Stack>
        <Divider borderColor='border.bold' />
      </HStack>
      <Box px={4}>
        <Button colorScheme='blue' size='lg' width='full' onClick={pairDevice} isLoading={loading}>
          <Text translation='walletProvider.walletConnect.topSection.viewAllWallets' />
        </Button>
      </Box>
    </Stack>
  )
}
