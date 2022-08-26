import { Box, ModalBody, ModalHeader } from '@chakra-ui/react'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { useEffect } from 'react'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import {
  setLocalNativeWalletName,
  setLocalWalletTypeAndDeviceId,
} from 'context/WalletProvider/local-wallet'
import { NativeConfig } from 'context/WalletProvider/NativeWallet/config'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { useWallet } from 'hooks/useWallet/useWallet'

import { MobileSetupProps } from '../types'

export const MobileSuccess = ({ location }: MobileSetupProps) => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const { state, dispatch } = useWallet()
  const { vault } = location.state

  useEffect(() => {
    ;(async () => {
      if (!vault) return
      const adapter = state.adapters?.get(KeyManager.Native)!
      try {
        await new Promise(resolve => setTimeout(resolve, 250))
        const deviceId = vault.id
        const wallet = (await adapter.pairDevice(deviceId)) as NativeHDWallet
        const mnemonic = vault.mnemonic
        if (mnemonic) {
          await wallet.loadDevice({ mnemonic, deviceId })
          const { name, icon } = NativeConfig
          const walletLabel = vault.label
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              icon,
              deviceId,
              meta: { label: walletLabel },
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          setLocalWalletTypeAndDeviceId(KeyManager.Native, deviceId)
          setLocalNativeWalletName(walletLabel)
          return setIsSuccessful(true)
        }
      } catch (error) {
        console.error('Failed to load device', error)
      }

      setIsSuccessful(false)
    })()

    return () => {
      vault?.revoke()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.success.header'} />
      </ModalHeader>
      <ModalBody>
        <Box color='gray.500'>
          {isSuccessful === true ? (
            <Text translation={'walletProvider.shapeShift.success.success'} />
          ) : isSuccessful === false ? (
            <Text translation={'walletProvider.shapeShift.success.error'} />
          ) : (
            <Text translation={'walletProvider.shapeShift.success.encryptingWallet'} />
          )}
        </Box>
      </ModalBody>
    </>
  )
}
