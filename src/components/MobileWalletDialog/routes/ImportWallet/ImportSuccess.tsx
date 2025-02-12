import { Button, Icon, VStack } from '@chakra-ui/react'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { useCallback, useEffect } from 'react'
import { IoIosCheckmarkCircle } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { MobileConfig } from 'context/WalletProvider/MobileWallet/config'
import type { MobileLocationState } from 'context/WalletProvider/MobileWallet/types'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { useWallet } from 'hooks/useWallet/useWallet'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch } from 'state/store'

type ImportSuccessProps = {
  onClose: () => void
}

export const ImportSuccess = ({ onClose }: ImportSuccessProps) => {
  const appDispatch = useAppDispatch()
  const location = useLocation<MobileLocationState | undefined>()
  const { setWelcomeModal } = preferences.actions
  const [isSuccessful, setIsSuccessful] = useStateIfMounted<boolean | null>(null)
  const { state, getAdapter, dispatch } = useWallet()
  const localWallet = useLocalWallet()
  const translate = useTranslate()

  useEffect(() => {
    ;(async () => {
      if (!location.state?.vault) return
      const adapter = await getAdapter(KeyManager.Mobile)
      if (!adapter) throw new Error('Native adapter not found')
      try {
        const deviceId = location.state.vault.id ?? ''
        const wallet = (await adapter.pairDevice(deviceId)) as NativeHDWallet
        const mnemonic = location.state.vault.mnemonic

        if (mnemonic) {
          await wallet.loadDevice({ mnemonic, deviceId })
          const { name, icon } = MobileConfig
          const walletLabel = location.state.vault.label ?? 'label'
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet,
              name,
              icon,
              deviceId,
              meta: { label: walletLabel },
              connectedType: KeyManager.Mobile,
            },
          })
          dispatch({
            type: WalletActions.SET_IS_CONNECTED,
            payload: true,
          })
          localWallet.setLocalWallet({ type: KeyManager.Mobile, deviceId })
          localWallet.setLocalNativeWalletName(walletLabel)
          dispatch({
            type: WalletActions.SET_CONNECTOR_TYPE,
            payload: { modalType: KeyManager.Mobile, isMipdProvider: false },
          })
          appDispatch(setWelcomeModal({ show: true }))
          return setIsSuccessful(true)
        }
      } catch (e) {
        console.log(e)
      }

      setIsSuccessful(false)
    })()

    return () => {
      // Make sure the component is completely unmounted before we revoke the mnemonic
      setTimeout(() => location.state?.vault?.revoke(), 500)
    }
  }, [
    appDispatch,
    dispatch,
    getAdapter,
    localWallet,
    setIsSuccessful,
    setWelcomeModal,
    state.modalType,
    location.state?.vault,
  ])

  const handleViewWallet = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={6} alignItems='center' flex={1} justifyContent='center'>
          {isSuccessful === true && (
            <>
              <Icon as={IoIosCheckmarkCircle} boxSize='50px' color='blue.500' />
              <VStack spacing={2} mb={10}>
                <Text
                  fontSize='xl'
                  fontWeight='bold'
                  translation='walletProvider.shapeShift.success.header'
                />
                <Text
                  color='text.subtle'
                  textAlign='center'
                  translation='walletProvider.shapeShift.success.success'
                />
              </VStack>
            </>
          )}
          {isSuccessful === false && (
            <Text color='text.subtle' translation='walletProvider.shapeShift.success.error' />
          )}
          {isSuccessful === null && (
            <Text
              color='text.subtle'
              translation='walletProvider.shapeShift.success.encryptingWallet'
            />
          )}
        </VStack>
      </DialogBody>
      {isSuccessful === true && (
        <DialogFooter>
          <Button colorScheme='blue' size='lg' width='full' onClick={handleViewWallet}>
            {translate('walletProvider.manualBackup.success.viewWallet')}
          </Button>
        </DialogFooter>
      )}
    </SlideTransition>
  )
}
