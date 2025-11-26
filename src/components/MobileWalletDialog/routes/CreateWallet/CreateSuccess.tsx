import { Button, Icon, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { IoIosCheckmarkCircle } from 'react-icons/io'
import { useTranslate } from 'react-polyglot'
import type { Location } from 'react-router-dom'
import { useLocation } from 'react-router-dom'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { MobileConfig } from '@/context/WalletProvider/MobileWallet/config'
import { addWallet } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { MobileLocationState } from '@/context/WalletProvider/MobileWallet/types'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch } from '@/state/store'

type CreateSuccessProps = {
  onClose: () => void
}

export const CreateSuccess = ({ onClose }: CreateSuccessProps) => {
  const translate = useTranslate()
  const appDispatch = useAppDispatch()
  const { setWelcomeModal } = preferences.actions
  const location: Location<MobileLocationState> = useLocation()
  const queryClient = useQueryClient()
  const { dispatch, getAdapter } = useWallet()
  const localWallet = useLocalWallet()

  const saveAndSelectWallet = useCallback(async () => {
    if (location.state?.vault?.label && location.state?.vault?.mnemonic) {
      const wallet = await addWallet({
        label: location.state.vault.label,
        mnemonic: location.state.vault.mnemonic,
      })

      if (!wallet) {
        return
      }

      const adapter = await getAdapter(KeyManager.Mobile)
      const deviceId = wallet.id
      if (adapter && deviceId) {
        const { name, icon } = MobileConfig
        try {
          const walletInstance = await adapter.pairDevice(deviceId)
          await walletInstance?.loadDevice({ mnemonic: location.state?.vault?.mnemonic ?? '' })

          if (!(await walletInstance?.isInitialized())) {
            await walletInstance?.initialize()
          }
          dispatch({
            type: WalletActions.SET_WALLET,
            payload: {
              wallet: walletInstance,
              name,
              icon,
              deviceId,
              meta: { label: location.state?.vault?.label },
              connectedType: KeyManager.Mobile,
            },
          })
          dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
          dispatch({
            type: WalletActions.SET_CONNECTOR_TYPE,
            payload: { modalType: KeyManager.Mobile, isMipdProvider: false },
          })

          localWallet.setLocalWallet({ type: KeyManager.Mobile, deviceId })
          localWallet.setLocalNativeWalletName(location.state?.vault?.label ?? 'label')
        } catch (e) {
          console.log(e)
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['listWallets'] })
      wallet.revoke()
      appDispatch(setWelcomeModal({ show: true }))
    }
  }, [
    location.state?.vault,
    dispatch,
    getAdapter,
    localWallet,
    queryClient,
    appDispatch,
    setWelcomeModal,
  ])

  const handleViewWallet = useCallback(() => {
    saveAndSelectWallet()
    onClose()
  }, [onClose, saveAndSelectWallet])

  const handleClose = useCallback(() => {
    saveAndSelectWallet()
    onClose()
    appDispatch(setWelcomeModal({ show: true }))
  }, [onClose, appDispatch, setWelcomeModal, saveAndSelectWallet])

  useEffect(() => {
    return () => {
      saveAndSelectWallet()
    }
  }, [])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderRight>
          <DialogCloseButton onClick={handleClose} />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={6} alignItems='center' flex={1} justifyContent='center'>
          <Icon as={IoIosCheckmarkCircle} boxSize='50px' color='blue.500' />

          <VStack spacing={2} mb={10}>
            <Text fontSize='xl' fontWeight='bold'>
              {translate('walletProvider.manualBackup.success.title')}
            </Text>
            <Text color='text.subtle' textAlign='center'>
              {translate('walletProvider.manualBackup.success.description')}
            </Text>
          </VStack>
        </VStack>
      </DialogBody>
      <DialogFooter>
        <Button colorScheme='blue' size='lg' width='full' onClick={handleViewWallet}>
          {translate('walletProvider.manualBackup.success.viewWallet')}
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
