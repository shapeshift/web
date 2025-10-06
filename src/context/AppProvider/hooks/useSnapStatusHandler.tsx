import { usePrevious } from '@chakra-ui/react'
import { btcAssetId, fromAccountId, thorchainChainId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { useDiscoverAccounts } from './useDiscoverAccounts'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { METAMASK_RDNS } from '@/lib/mipd'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { selectEnabledWalletAccountIds, selectWalletId } from '@/state/slices/common-selectors'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useSnapStatusHandler = () => {
  const queryClient = useQueryClient()
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const toast = useNotificationToast({ desktopPosition: 'top-right' })
  const connectedRdns = useAppSelector(selectWalletRdns)
  const previousConnectedRdns = usePrevious(connectedRdns)
  const currentWalletId = useAppSelector(selectWalletId)
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()
  const snapModal = useModal('snaps')
  const previousSnapInstall = usePrevious(isSnapInstalled)
  const {
    state: { deviceId },
    dispatch,
  } = useWallet()
  const navigate = useNavigate()
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()

  useEffect(() => {
    if (isDiscoveringAccounts) return
    if (!isCorrectVersion && isSnapInstalled) return
    if (!currentWalletId) return
    if (previousConnectedRdns !== METAMASK_RDNS || connectedRdns !== METAMASK_RDNS) return

    const hasSnapSupportedChainIds = enabledWalletAccountIds.some(
      id => isUtxoAccountId(id) || fromAccountId(id).chainId === thorchainChainId,
    )

    if (
      isSnapInstalled === false &&
      // User doesn't have any utxo or thorchain accounts but has snap installed
      // we assume they installed the snap and maybe outside of the app
      hasSnapSupportedChainIds
    ) {
      // they uninstalled the snap
      toast({
        status: 'success',
        title: translate('walletProvider.metaMaskSnap.snapUninstalledToast'),
        position: 'bottom',
      })
      appDispatch(portfolio.actions.clearWalletMetadata(currentWalletId))

      queryClient.invalidateQueries({
        queryKey: ['useDiscoverAccounts', { deviceId, isSnapInstalled }],
        exact: false,
        refetchType: 'all',
      })
      return snapModal.open({ isRemoved: true })
    }

    // User hasn't the snap installed but has snap supported chain ids
    // We assume they uninstalled the snap and maybe outside of the app
    if (isSnapInstalled && !hasSnapSupportedChainIds) {
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
    previousSnapInstall,
    snapModal,
    toast,
    translate,
    queryClient,
    navigate,
    enabledWalletAccountIds,
    isDiscoveringAccounts,
  ])
}
