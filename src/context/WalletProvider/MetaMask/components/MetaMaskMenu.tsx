import { MenuItem, Skeleton, Tag } from '@chakra-ui/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { TbPlugConnected } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { WalletActions } from '@/context/WalletProvider/actions'
import {
  checkIsMetaMaskDesktop,
  useIsSnapInstalled,
} from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'

type MetaMaskMenuProps = {
  onClose?: () => void
}

export const MetaMaskMenu: React.FC<MetaMaskMenuProps> = ({ onClose }) => {
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()
  const translate = useTranslate()
  const snapModal = useModal('snaps')
  const [isMetaMask, setIsMetaMask] = useState<null | boolean>(null)

  const {
    state: { wallet, isConnected, isLocked },
    dispatch,
  } = useWallet()

  useEffect(() => {
    if (!wallet) return
    const isMetaMaskDesktop = checkIsMetaMaskDesktop(wallet)
    setIsMetaMask(isMetaMaskDesktop)
  }, [wallet])

  const handleClick = useCallback(() => {
    if (isSnapInstalled === false || isCorrectVersion === false) {
      snapModal.open({})
    }
  }, [isCorrectVersion, isSnapInstalled, snapModal])

  const handleReconnectWallet = useCallback(() => {
    dispatch({
      type: WalletActions.SET_INITIAL_ROUTE,
      payload: '/metamask/connect',
    })
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    onClose?.()
  }, [dispatch, onClose])

  const renderSnapStatus = useMemo(() => {
    if (isSnapInstalled) {
      return isCorrectVersion ? (
        <Tag colorScheme='green'>{translate('walletProvider.metaMaskSnap.active')}</Tag>
      ) : (
        <Tag colorScheme='red'>{translate('common.update')}</Tag>
      )
    }

    if (!isSnapInstalled) {
      return <Tag>{translate('walletProvider.metaMaskSnap.notActive')}</Tag>
    }
  }, [isCorrectVersion, isSnapInstalled, translate])

  const reconnectIcon = useMemo(() => <TbPlugConnected />, [])

  return (
    <>
      {isMetaMask && isSnapInstalled && isCorrectVersion && (
        <ManageAccountsMenuItem onClose={onClose} />
      )}
      {(!isConnected || isLocked) && (
        <MenuItem icon={reconnectIcon} onClick={handleReconnectWallet} color='green.500'>
          {translate('connectWallet.menu.reconnectWallet')}
        </MenuItem>
      )}
      {isMetaMask && (
        <MenuItem
          justifyContent='space-between'
          onClick={handleClick}
          isDisabled={isSnapInstalled === true && isCorrectVersion === true}
        >
          {translate('walletProvider.metaMaskSnap.multiChainSnap')}
          <Skeleton isLoaded={isSnapInstalled !== null}>{renderSnapStatus}</Skeleton>
        </MenuItem>
      )}
    </>
  )
}
