import { RepeatIcon } from '@chakra-ui/icons'
import { MenuItem } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'

const switchIcon = <RepeatIcon />

type GridPlusMenuProps = {
  onClose?: () => void
}

export const GridPlusMenu = ({ onClose }: GridPlusMenuProps) => {
  const translate = useTranslate()
  const { dispatch } = useWallet()

  const handleSwitchSafeCard = useCallback(() => {
    // Disconnect current wallet
    dispatch({ type: WalletActions.RESET_STATE })

    // Open wallet modal to GridPlus connect screen
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: '/gridplus/connect',
    })
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

    onClose?.()
  }, [dispatch, onClose])

  return (
    <>
      <MenuItem icon={switchIcon} onClick={handleSwitchSafeCard}>
        {translate('walletProvider.gridplus.menu.switchSafeCard')}
      </MenuItem>
      <ManageAccountsMenuItem onClose={onClose} />
    </>
  )
}
