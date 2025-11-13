import { MenuItem } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { WalletActions } from '@/context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'

type TrezorMenuProps = {
  onClose?: () => void
}

export const TrezorMenu: React.FC<TrezorMenuProps> = ({ onClose }) => {
  const { dispatch } = useWallet()
  const translate = useTranslate()

  const handleChainsClick = useCallback(() => {
    const trezorRoutes = SUPPORTED_WALLETS[KeyManager.Trezor].routes
    const path = trezorRoutes.find(route => route.path === '/trezor/chains')?.path as string
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: path,
    })

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  return (
    <>
      <ManageAccountsMenuItem onClose={onClose} />
      <MenuItem justifyContent='space-between' onClick={handleChainsClick}>
        {translate('walletProvider.trezor.chains.header')}
      </MenuItem>
    </>
  )
}
