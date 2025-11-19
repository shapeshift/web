import { ChatIcon, CloseIcon, EditIcon, SettingsIcon, ViewIcon } from '@chakra-ui/icons'
import { Button, Stack } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { TbCircleArrowDown, TbCirclePlus, TbDownload } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { MobileWalletDialogRoutes } from '../types'

import { MainNavLink } from '@/components/Layout/Header/NavBar/MainNavLink'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SlideTransition } from '@/components/SlideTransition'
import { getWallet } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { createRevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from '@/hooks/useModal/useModal'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { vibrate } from '@/lib/vibrate'
import { MobileWalletList } from '@/pages/ConnectWallet/components/WalletList'
import { WalletConnectToDappsHeaderButton } from '@/plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton'

const addIcon = <TbCirclePlus />
const importIcon = <TbCircleArrowDown />
const downloadIcon = <TbDownload />
const settingsIcon = <SettingsIcon />
const chatIcon = <ChatIcon />
const editIcon = <EditIcon />
const viewIcon = <ViewIcon />
const closeIcon = <CloseIcon />

const disconnectButtonSx = {
  svg: {
    width: '14px',
    height: '14px',
  },
}

type SavedWalletsProps = {
  onClose: () => void
}

export const SavedWallets: React.FC<SavedWalletsProps> = ({ onClose }) => {
  const translate = useTranslate()
  const settings = useModal('settings')
  const feedbackSupport = useModal('feedbackSupport')
  const manageHiddenAssets = useModal('manageHiddenAssets')
  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')
  const { disconnect, state } = useWallet()
  const [isEditing, toggleEditing] = useToggle()
  const [error, setError] = useState<string | null>(null)
  const handleClickSettings = useCallback(() => {
    settings.open({})
    onClose()
  }, [onClose, settings])
  const accountManagementPopover = useModal('manageAccounts')
  const mobileWalletDialog = useModal('mobileWalletDialog')
  const navigate = useNavigate()

  const handleBackupMenuItemClick = useCallback(async () => {
    vibrate('heavy')
    const revocableWallet = createRevocableWallet({
      id: state.walletInfo?.deviceId,
      label: state.walletInfo?.name,
    })

    const wallet = await getWallet(state.walletInfo?.deviceId ?? '')
    if (wallet?.mnemonic) {
      revocableWallet.mnemonic = wallet.mnemonic

      navigate(MobileWalletDialogRoutes.Backup, { state: { vault: wallet } })
    }
  }, [navigate, state])

  const handleManageAccountsMenuItemClick = useCallback(() => {
    vibrate('heavy')
    accountManagementPopover.open({ onBack: mobileWalletDialog.open })
    onClose()
  }, [accountManagementPopover, onClose, mobileWalletDialog])

  const handleManageHiddenAssetsClick = useCallback(() => {
    vibrate('heavy')
    manageHiddenAssets.open({})
    onClose()
  }, [manageHiddenAssets, onClose])

  const handleClickSupport = useCallback(() => {
    vibrate('heavy')
    feedbackSupport.open({})
    onClose()
  }, [onClose, feedbackSupport])

  const handleCreateClick = useCallback(() => {
    vibrate('heavy')
    navigate(MobileWalletDialogRoutes.Create)
  }, [navigate])

  const handleImportClick = useCallback(() => {
    vibrate('heavy')
    navigate(MobileWalletDialogRoutes.Import)
  }, [navigate])

  const handleDisconnectClick = useCallback(() => {
    vibrate('heavy')
    disconnect()
    onClose()
  }, [disconnect, onClose])

  const mobileWalletFooter = useMemo(() => {
    return (
      <Stack pb={4} spacing={0}>
        <Button
          variant='ghost'
          colorScheme='blue'
          leftIcon={addIcon}
          onClick={handleCreateClick}
          justifyContent='flex-start'
        >
          {translate('connectWalletPage.createANewWallet')}
        </Button>
        <Button
          variant='ghost'
          colorScheme='blue'
          leftIcon={importIcon}
          onClick={handleImportClick}
          justifyContent='flex-start'
        >
          {translate('connectWalletPage.importExisting')}
        </Button>
        <Button
          variant='ghost'
          colorScheme='blue'
          leftIcon={editIcon}
          onClick={handleManageAccountsMenuItemClick}
          justifyContent='flex-start'
        >
          {translate('accountManagement.menuTitle')}
        </Button>
        <Button
          variant='ghost'
          colorScheme='blue'
          leftIcon={viewIcon}
          onClick={handleManageHiddenAssetsClick}
          justifyContent='flex-start'
        >
          {translate('manageHiddenAssets.title')}
        </Button>
        <Button
          variant='ghost'
          colorScheme='blue'
          leftIcon={downloadIcon}
          onClick={handleBackupMenuItemClick}
          justifyContent='flex-start'
        >
          {translate('modals.shapeShift.backupPassphrase.menuItem')}
        </Button>
      </Stack>
    )
  }, [
    handleImportClick,
    handleManageAccountsMenuItemClick,
    handleManageHiddenAssetsClick,
    handleBackupMenuItemClick,
    translate,
    handleCreateClick,
  ])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderMiddle>
          <DialogTitle>{translate('walletProvider.shapeShift.load.header')}</DialogTitle>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          {!error ? (
            <Button variant='unstyled' color='text.link' onClick={toggleEditing}>
              {isEditing ? translate('common.done') : translate('common.edit')}
            </Button>
          ) : null}
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <MobileWalletList
          footerComponent={mobileWalletFooter}
          isEditing={isEditing}
          onErrorChange={setError}
        />
      </DialogBody>
      <DialogFooter borderTopWidth={1} borderColor='border.base' pt={4} flexDir='column'>
        {isWalletConnectToDappsV2Enabled && <WalletConnectToDappsHeaderButton />}
        <MainNavLink
          size='sm'
          onClick={handleClickSettings}
          label={translate('common.settings')}
          leftIcon={settingsIcon}
          data-test='navigation-settings-button'
          height='32px'
          mt={2}
        />
        <MainNavLink
          size='sm'
          onClick={handleClickSupport}
          label={translate('common.feedbackAndSupport')}
          leftIcon={chatIcon}
          height='32px'
        />
        <MainNavLink
          size='sm'
          onClick={handleDisconnectClick}
          label={translate('connectWallet.menu.disconnect')}
          leftIcon={closeIcon}
          color='red.500'
          height='32px'
          sx={disconnectButtonSx}
        />
      </DialogFooter>
    </SlideTransition>
  )
}
