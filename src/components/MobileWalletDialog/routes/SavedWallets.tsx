import { ChatIcon, SettingsIcon } from '@chakra-ui/icons'
import { Button, Stack } from '@chakra-ui/react'
import { WalletConnectToDappsHeaderButton } from 'plugins/walletConnectToDapps/components/header/WalletConnectToDappsHeaderButton'
import { useCallback, useMemo, useState } from 'react'
import { TbCircleArrowDown, TbCirclePlus } from 'react-icons/tb'
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
import { useWallet } from 'hooks/useWallet/useWallet'
import { MobileWalletList } from 'pages/ConnectWallet/components/WalletList'

const addIcon = <TbCirclePlus />
const importIcon = <TbCircleArrowDown />
const settingsIcon = <SettingsIcon />
const chatIcon = <ChatIcon />

type SavedWalletsProps = {
  onClose: () => void
}

export const SavedWallets: React.FC<SavedWalletsProps> = ({ onClose }) => {
  const translate = useTranslate()
  const settings = useModal('settings')
  const feedbackSupport = useModal('feedbackSupport')
  const isWalletConnectToDappsV2Enabled = useFeatureFlag('WalletConnectToDappsV2')
  const { dispatch, create, importWallet } = useWallet()
  const [isEditing, setIsEditing] = useState(false)
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

  const handleEditToggle = useCallback(() => {
    setIsEditing(!isEditing)
  }, [isEditing])

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
      </Stack>
    )
  }, [handleCreate, handleImport, translate])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderMiddle>
          <DialogTitle>{translate('walletProvider.shapeShift.load.header')}</DialogTitle>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <Button variant='unstyled' color='text.link' onClick={handleEditToggle}>
            {isEditing ? translate('common.done') : translate('common.edit')}
          </Button>
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <MobileWalletList footerComponent={mobileWalletFooter} isEditing={isEditing} />
      </DialogBody>
      <DialogFooter borderTopWidth={1} borderColor='border.base' pt={4} flexDir='column'>
        {isWalletConnectToDappsV2Enabled && <WalletConnectToDappsHeaderButton />}
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
    </SlideTransition>
  )
}
