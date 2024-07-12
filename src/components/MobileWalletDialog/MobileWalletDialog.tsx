import { AddIcon, ArrowDownIcon, ChatIcon, SettingsIcon } from '@chakra-ui/icons'
import { Button, Stack } from '@chakra-ui/react'
import { WalletConnectToDappsHeaderButton } from 'plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { MainNavLink } from 'components/Layout/Header/NavBar/MainNavLink'
import { Dialog } from 'components/Modal/components/Dialog'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import { DialogTitle } from 'components/Modal/components/DialogTitle'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { WalletList } from 'pages/ConnectWallet/components/WalletList'

const addIcon = <AddIcon />
const importIcon = <ArrowDownIcon />
const settingsIcon = <SettingsIcon />
const chatIcon = <ChatIcon />

type MobileWalletDialogProps = {
  isOpen: boolean
  onClose: () => void
}

export const MobileWalletDialog: React.FC<MobileWalletDialogProps> = ({ isOpen, onClose }) => {
  const translate = useTranslate()
  const settings = useModal('settings')
  const feedbackSupport = useModal('feedbackSupport')
  const { dispatch, create, importWallet } = useWallet()
  const handleClickSettings = useCallback(() => {
    settings.open({})
    onClose && onClose()
  }, [onClose, settings])

  const handleClickSupport = useCallback(() => {
    feedbackSupport.open({})
    onClose && onClose()
  }, [onClose, feedbackSupport])

  const handleCreate = useCallback(() => {
    onClose && onClose()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    create(KeyManager.Mobile)
  }, [create, dispatch, onClose])

  const handleImport = useCallback(() => {
    onClose && onClose()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    importWallet(KeyManager.Mobile)
  }, [dispatch, importWallet, onClose])
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogHeaderMiddle>
          <DialogTitle>Saved Wallets</DialogTitle>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <Button variant='ghost' colorScheme='blue'>
            Edit
          </Button>
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <WalletList />
        <Stack py={4} spacing={0}>
          <MainNavLink
            color='text.link'
            leftIcon={addIcon}
            size='sm'
            onClick={handleCreate}
            label={translate('connectWalletPage.createANewWallet')}
          />
          <MainNavLink
            color='text.link'
            colorScheme='blue'
            leftIcon={importIcon}
            size='sm'
            onClick={handleImport}
            label={translate('connectWalletPage.importExisting')}
          />
        </Stack>
      </DialogBody>
      <DialogFooter borderTopWidth={1} borderColor='border.base' pt={4} flexDir='column'>
        <WalletConnectToDappsHeaderButton />
        <MainNavLink
          size='sm'
          onClick={handleClickSettings}
          label={translate('common.settings')}
          leftIcon={settingsIcon}
          data-test='navigation-settings-button'
        />
        <MainNavLink
          size='sm'
          onClick={handleClickSupport}
          label={translate('common.feedbackAndSupport')}
          leftIcon={chatIcon}
        />
      </DialogFooter>
    </Dialog>
  )
}
