import { Box, ModalBody, ModalHeader } from '@chakra-ui/react'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { useEffect } from 'react'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import {
  setLocalNativeWalletName,
  setLocalWalletTypeAndDeviceId,
} from 'context/WalletProvider/local-wallet'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { useWallet } from 'hooks/useWallet/useWallet'

import { MobileConfig, mobileLogger } from '../config'
import type { MobileSetupProps } from '../types'

const moduleLogger = mobileLogger.child({
  namespace: ['components', 'MobileSuccess'],
})

export const MobileSuccess = ({ location }: MobileSetupProps) => {
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const { state, dispatch } = useWallet()
  const { vault } = location.state

  useEffect(() => {
    ;(async () => {
      if (!vault) return
      const adapter = state.adapters?.get(KeyManager.Native)!
      try {
        const deviceId = vault.id ?? ''
        const wallet = (await adapter.pairDevice(deviceId)) as NativeHDWallet
        const mnemonic = vault.mnemonic

        if (mnemonic) {
          await wallet.loadDevice({ mnemonic, deviceId })
          const { name, icon } = MobileConfig
          const walletLabel = vault?.label ?? 'label'
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
          setLocalWalletTypeAndDeviceId(KeyManager.Mobile, deviceId)
          setLocalNativeWalletName(walletLabel)
          return setIsSuccessful(true)
        }
      } catch (e) {
        moduleLogger.error(e, { vault }, 'Error pairing device')
      }

      setIsSuccessful(false)
    })()

    return () => {
      // Make sure the component is completely unmounted before we revoke the mnemonic
      setTimeout(() => vault?.revoke(), 500)
    }
  }, [dispatch, setIsSuccessful, state.adapters, vault])

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
