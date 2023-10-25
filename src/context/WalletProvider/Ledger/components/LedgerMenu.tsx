import { MenuDivider, MenuItem } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'

export const LedgerMenu = () => {
  const { dispatch } = useWallet()
  const translate = useTranslate()

  const handleClick = useCallback(() => {
    const ledgerRoutes = SUPPORTED_WALLETS[KeyManager.Ledger].routes
    const path = ledgerRoutes.find(route => route.path === '/ledger/chains')?.path as string
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: path,
    })

    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  return (
    <>
      <MenuDivider />
      <MenuItem justifyContent='space-between' onClick={handleClick}>
        {translate('Connect Accounts')}
      </MenuItem>
    </>
  )
}
