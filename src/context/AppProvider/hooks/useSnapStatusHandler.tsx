import { usePrevious, useToast } from '@chakra-ui/react'
import { btcAssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { METAMASK_RDNS } from '@/lib/mipd'
import { selectEnabledWalletAccountIds, selectWalletId } from '@/state/slices/common-selectors'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useSnapStatusHandler = () => {
  const queryClient = useQueryClient()
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const toast = useToast()
  const connectedRdns = useAppSelector(selectWalletRdns)
  const previousConnectedRdns = usePrevious(connectedRdns)
  const currentWalletId = useAppSelector(selectWalletId)
  const walletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()
  const snapModal = useModal('snaps')
  const previousSnapInstall = usePrevious(isSnapInstalled)
  const previousIsCorrectVersion = usePrevious(isCorrectVersion)
  const showSnapModal = useSelector(preferences.selectors.selectShowSnapsModal)
  const {
    state: { wallet, deviceId },
    dispatch,
  } = useWallet()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isCorrectVersion && isSnapInstalled) return
    if (!currentWalletId) return

    if (
      previousSnapInstall === true &&
      isSnapInstalled === false &&
      previousIsCorrectVersion === true &&
      !snapModal.isOpen
    ) {
      if (previousConnectedRdns === METAMASK_RDNS && connectedRdns === METAMASK_RDNS) {
        // they uninstalled the snap
        toast({
          status: 'success',
          title: translate('walletProvider.metaMaskSnap.snapUninstalledToast'),
          position: 'bottom',
        })
      }
      appDispatch(portfolio.actions.clearWalletMetadata(currentWalletId))

      queryClient.invalidateQueries({
        queryKey: ['useDiscoverAccounts', { deviceId, isSnapInstalled }],
        exact: false,
        refetchType: 'all',
      })
      if (previousConnectedRdns === METAMASK_RDNS && connectedRdns === METAMASK_RDNS) {
        return snapModal.open({ isRemoved: true })
      }
    }

    if (
      previousSnapInstall === false &&
      isSnapInstalled === true &&
      previousConnectedRdns === METAMASK_RDNS &&
      connectedRdns === METAMASK_RDNS
    ) {
      console.log('clearing metadata')
      appDispatch(portfolio.actions.clearWalletMetadata(currentWalletId))
      navigate(`/assets/${btcAssetId}`)
      queryClient.invalidateQueries({
        queryKey: ['useDiscoverAccounts', { deviceId, isSnapInstalled }],
        exact: false,
        refetchType: 'all',
      })

      // they installed the snap
      toast({
        status: 'success',
        title: translate('walletProvider.metaMaskSnap.snapInstalledToast'),
        position: 'bottom',
      })
      return dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    }
  }, [
    deviceId,
    appDispatch,
    connectedRdns,
    currentWalletId,
    dispatch,
    isCorrectVersion,
    isSnapInstalled,
    previousConnectedRdns,
    previousIsCorrectVersion,
    previousSnapInstall,
    showSnapModal,
    snapModal,
    toast,
    translate,
    wallet,
    walletAccountIds,
    queryClient,
    navigate,
  ])
}
