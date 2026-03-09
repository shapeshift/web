import { useCallback } from 'react'

import { NativeMultichainContent } from './NativeMultichainContent'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useNativeMultichainChoice } from '@/context/WalletProvider/MetaMask/hooks/useNativeMultichainChoice'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const NativeMultichainStep: React.FC = () => {
  const { dispatch } = useWallet()

  const closeModal = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
  }, [dispatch])

  const { hasSnap, chainAssets, handleUseNative, handleKeepSnap } = useNativeMultichainChoice({
    onDismiss: closeModal,
  })

  return (
    <NativeMultichainContent
      hasSnap={hasSnap}
      chainAssets={chainAssets}
      onUseNative={handleUseNative}
      onKeepSnap={handleKeepSnap}
    />
  )
}
