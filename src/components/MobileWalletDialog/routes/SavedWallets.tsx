import { ChatIcon, CloseIcon, EditIcon, SettingsIcon } from '@chakra-ui/icons'
import { Button, Stack } from '@chakra-ui/react'
import { WalletConnectToDappsHeaderButton } from 'plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton'
import { useCallback, useMemo, useState } from 'react'
import { TbCircleArrowDown, TbCirclePlus, TbDownload } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { MainNavLink } from 'components/Layout/Header/NavBar/MainNavLink'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import { DialogTitle } from 'components/Modal/components/DialogTitle'
import { SlideTransition } from 'components/SlideTransition'
import { getWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { createRevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { MobileWallestList } from 'pages/ConnectWallet/components/WalletList'

import { MobileWalletDialogRoutes } from '../types'

const addIcon = <TbCirclePlus />
const importIcon = <TbCircleArrowDown />
const downloadIcon = <TbDownload />
const settingsIcon = <SettingsIcon />
const chatIcon = <ChatIcon />
const editIcon = <EditIcon />
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
  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')
  const { disconnect, state } = useWallet()
  const [isEditing, toggleEditing] = useToggle()
  const [error, setError] = useState<string | null>(null)
  const handleClickSettings = useCallback(() => {
    settings.open({})
    onClose()
  }, [onClose, settings])
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')
  const accountManagementPopover = useModal('manageAccounts')
  const history = useHistory()

  const handleBackupMenuItemClick = useCallback(async () => {
    const revocableWallet = createRevocableWallet({
      id: state.walletInfo?.deviceId,
      label: state.walletInfo?.name,
    })

    const wallet = await getWallet(state.walletInfo?.deviceId ?? '')
    if (wallet?.mnemonic) {
      revocableWallet.mnemonic = wallet.mnemonic

      history.push(MobileWalletDialogRoutes.Backup, { vault: wallet })
    }
  }, [history, state])

  const handleManageAccountsMenuItemClick = useCallback(() => {
    accountManagementPopover.open({})
  }, [accountManagementPopover])

  const handleClickSupport = useCallback(() => {
    feedbackSupport.open({})
    onClose()
  }, [onClose, feedbackSupport])

  const handleCreateClick = useCallback(() => {
    history.push(MobileWalletDialogRoutes.Create)
  }, [history])

  const handleImportClick = useCallback(() => {
    history.push(MobileWalletDialogRoutes.Import)
  }, [history])

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

        {isAccountManagementEnabled ? (
          <Button
            variant='ghost'
            colorScheme='blue'
            leftIcon={editIcon}
            onClick={handleManageAccountsMenuItemClick}
            justifyContent='flex-start'
          >
            {translate('accountManagement.menuTitle')}
          </Button>
        ) : null}
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
    handleBackupMenuItemClick,
    isAccountManagementEnabled,
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
        <MobileWallestList
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
          onClick={disconnect}
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
