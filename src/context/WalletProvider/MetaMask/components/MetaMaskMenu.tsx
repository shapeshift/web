import { MenuDivider, MenuItem, Skeleton, Tag } from '@chakra-ui/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { ManageAccountsMenuItem } from 'components/Layout/Header/NavBar/ManageAccountsMenuItem'
import {
  checkIsMetaMaskDesktop,
  checkIsMetaMaskImpersonator,
  useIsSnapInstalled,
} from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

type MetaMaskMenuProps = {
  onClose?: () => void
}

export const MetaMaskMenu: React.FC<MetaMaskMenuProps> = ({ onClose }) => {
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()
  const translate = useTranslate()
  const snapModal = useModal('snaps')
  const [isMetaMask, setIsMetaMask] = useState<null | boolean>(null)

  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const isMetaMaskDesktop = await checkIsMetaMaskDesktop(wallet)
      const isMetaMaskImpersonator = await checkIsMetaMaskImpersonator(wallet)
      setIsMetaMask(isMetaMaskDesktop && !isMetaMaskImpersonator)
    })()
  }, [wallet])

  const handleClick = useCallback(() => {
    if (isSnapInstalled === false || isCorrectVersion === false) {
      snapModal.open({})
    }
  }, [isCorrectVersion, isSnapInstalled, snapModal])

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

  return isMetaMask ? (
    <>
      <MenuDivider />
      {isSnapInstalled && isCorrectVersion && <ManageAccountsMenuItem onClose={onClose} />}
      <MenuItem
        justifyContent='space-between'
        onClick={handleClick}
        isDisabled={isSnapInstalled === true && isCorrectVersion === true}
      >
        {translate('walletProvider.metaMaskSnap.multiChainSnap')}
        <Skeleton isLoaded={isSnapInstalled !== null}>{renderSnapStatus}</Skeleton>
      </MenuItem>
    </>
  ) : null
}
