import { ChatIcon, CloseIcon, EditIcon, SettingsIcon } from '@chakra-ui/icons'
import { Button, Stack } from '@chakra-ui/react'
import { WalletConnectToDappsHeaderButton } from 'plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton'
import { useCallback, useMemo, useState } from 'react'
import { TbCircleArrowDown, TbCirclePlus, TbDownload } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
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
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import { MobileWallestList } from 'pages/ConnectWallet/components/WalletList'

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
  const { dispatch, create, importWallet, disconnect } = useWallet()
  const [isEditing, toggleEditing] = useToggle()
  const [error, setError] = useState<string | null>(null)
  const handleClickSettings = useCallback(() => {
    settings.open({})
    onClose()
  }, [onClose, settings])
  const backupNativePassphrase = useModal('backupNativePassphrase')
  const isAccountManagementEnabled = useFeatureFlag('AccountManagement')
  const accountManagementPopover = useModal('manageAccounts')

  const handleBackupMenuItemClick = useCallback(() => {
    backupNativePassphrase.open({})
  }, [backupNativePassphrase])

  const handleManageAccountsMenuItemClick = useCallback(() => {
    accountManagementPopover.open({})
  }, [accountManagementPopover])

  const handleClickSupport = useCallback(() => {
    feedbackSupport.open({})
    onClose()
  }, [onClose, feedbackSupport])

  const handleCreate = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    create(KeyManager.Mobile)
  }, [create, dispatch])

  const handleImport = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    importWallet(KeyManager.Mobile)
  }, [dispatch, importWallet])

  const mobileWalletFooter = useMemo(() => {
    return (
      <Stack pb={4} spacing={0}>
        <Button
          variant='ghost'
          colorScheme='blue'
          leftIcon={addIcon}
          onClick={handleCreate}
          justifyContent='flex-start'
        >
          {translate('connectWalletPage.createANewWallet')}
        </Button>
        <Button
          variant='ghost'
          colorScheme='blue'
          leftIcon={importIcon}
          onClick={handleImport}
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
    handleImport,
    handleCreate,
    handleManageAccountsMenuItemClick,
    handleBackupMenuItemClick,
    isAccountManagementEnabled,
    translate,
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
