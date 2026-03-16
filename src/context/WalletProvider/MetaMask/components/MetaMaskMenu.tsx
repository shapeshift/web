import { MenuItem, Skeleton, Tag } from '@chakra-ui/react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { ManageAccountsMenuItem } from '@/components/Layout/Header/NavBar/ManageAccountsMenuItem'
import { useAccountMigration } from '@/context/AppProvider/hooks/useAccountMigration'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import {
  checkIsMetaMaskDesktop,
  useIsSnapInstalled,
} from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useModal } from '@/hooks/useModal/useModal'
import { useNativeMultichainPreference } from '@/hooks/useNativeMultichainPreference'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectWalletId } from '@/state/slices/common-selectors'
import { useAppSelector } from '@/state/store'

type MetaMaskMenuProps = {
  onClose?: () => void
}

export const MetaMaskMenu: React.FC<MetaMaskMenuProps> = ({ onClose }) => {
  const isMmNativeMultichain = useFeatureFlag('MmNativeMultichain')
  const { isSnapInstalled, isCorrectVersion } = useIsSnapInstalled()
  const translate = useTranslate()
  const snapModal = useModal('snaps')
  const [isMetaMask, setIsMetaMask] = useState<null | boolean>(null)
  const walletId = useAppSelector(selectWalletId)
  const { migrateAccounts } = useAccountMigration()

  const {
    state: { wallet, deviceId },
  } = useWallet()

  const { isNativeMode, setPreference } = useNativeMultichainPreference(deviceId)

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

  const handleSwitchMode = useCallback(() => {
    const newMode = isNativeMode ? 'snap' : 'native'
    setPreference(newMode)
    if (walletId) {
      migrateAccounts(walletId)
    }
    onClose?.()
  }, [isNativeMode, setPreference, walletId, migrateAccounts, onClose])

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
      {isMmNativeMultichain ? (
        <>
          <ManageAccountsMenuItem onClose={onClose} />
          <MenuItem justifyContent='space-between'>
            {isNativeMode
              ? translate('walletProvider.nativeMultichain.nativeActive')
              : translate('walletProvider.nativeMultichain.snapActive')}
            <Tag colorScheme='green'>{translate('walletProvider.metaMaskSnap.active')}</Tag>
          </MenuItem>
          <MenuItem onClick={handleSwitchMode}>
            {isNativeMode
              ? translate('walletProvider.nativeMultichain.switchToSnap')
              : translate('walletProvider.nativeMultichain.switchToNative')}
          </MenuItem>
        </>
      ) : (
        <>
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
      )}
    </>
  ) : null
}
