import { CloseIcon, InfoIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Alert, AlertIcon, Button, Flex } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route } from 'react-router-dom'
import { ExpandedMenuItem } from 'components/Layout/Header/NavBar/ExpandedMenuItem'
import {
  useMenuRoutes,
  WalletConnectedRoutes
} from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { WalletImage } from 'components/Layout/Header/NavBar/UserMenu'
import { RawText, Text } from 'components/Text'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'
import { MessageType } from 'context/WalletProvider/KeepKey/KeepKeyTypes'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const KeepKeyMenuRoutes = () => {
  const { handleChangePinClick } = useMenuRoutes()
  const translate = useTranslate()
  const { wallet, versions, keyring } = useKeepKeyWallet()
  const { state } = useWallet()
  const { isConnected, walletInfo } = state
  const [awaitingButtonPress, setAwaitingButtonPress] = useState(false)
  const [pinUpdateStatus, setPinUpdateStatus] = useState<'success' | 'failure' | undefined>()

  const getBooleanLabel = (value: boolean | undefined) => {
    return value
      ? translate('walletProvider.keepKey.settings.status.enabled')
      : translate('walletProvider.keepKey.settings.status.disabled')
  }

  const getUpdateText = (updateAvailable: boolean | undefined) => {
    return updateAvailable
      ? translate('walletProvider.keepKey.settings.status.updateAvailable')
      : translate('walletProvider.keepKey.settings.status.upToDate')
  }

  const handleChangePinInitializeEvent = async () => {
    setAwaitingButtonPress(true)

    keyring.on(['KeepKey', '*', MessageType.PINMATRIXREQUEST.toString()], () =>
      setAwaitingButtonPress(false)
    )
    keyring.on(['KeepKey', '*', MessageType.SUCCESS.toString()], () =>
      setPinUpdateStatus('success')
    )
    keyring.on(['KeepKey', '*', MessageType.FAILURE.toString()], () =>
      setPinUpdateStatus('failure')
    )

    await wallet?.changePin()
  }

  const keepKeyMenu = () => {
    const keepKeyStateLoading = (
      <>
        <SubmenuHeader title={translate('common.connectedWalletSettings')} />
        <MenuGroup>
          <Flex ml={3}>
            <WalletImage walletInfo={walletInfo} />
            <Flex flex={1} ml={3} justifyContent='space-between' alignItems='center'>
              <RawText>{walletInfo?.name}</RawText>
              <Text
                ml={3}
                mr={3}
                translation='walletProvider.keepKey.settings.loadingText'
                fontSize='sm'
                color='yellow.500'
              />
            </Flex>
          </Flex>
        </MenuGroup>
      </>
    )

    const keepKeyStateLoaded = wallet?.features && (
      <>
        <SubmenuHeader title={translate('common.connectedWalletSettings')} />
        <MenuGroup>
          <Flex ml={3}>
            <WalletImage walletInfo={walletInfo} />
            <Flex flex={1} ml={3} justifyContent='space-between' alignItems='center'>
              <RawText>{walletInfo?.name}</RawText>
              {!isConnected && (
                <Text
                  mr={3}
                  translation={'connectWallet.menu.disconnected'}
                  fontSize='sm'
                  color='yellow.500'
                />
              )}
            </Flex>
          </Flex>
          <MenuDivider />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.bootloader')}
            value={getUpdateText(versions?.bootloader.updateAvailable)}
            // badge={versions?.bootloader.device}
            badge='TODO'
            badgeColor={versions?.bootloader.updateAvailable ? 'yellow' : 'green'}
            valueDisposition={versions?.bootloader.updateAvailable ? 'info' : 'neutral'}
          />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.firmware')}
            value={getUpdateText(versions?.firmware.updateAvailable)}
            badge={versions?.firmware.device}
            badgeColor={versions?.firmware.updateAvailable ? 'yellow' : 'green'}
            valueDisposition={versions?.firmware.updateAvailable ? 'info' : 'neutral'}
          />
          <MenuDivider />
          <ExpandedMenuItem label='Label' value={walletInfo?.name} hasSubmenu={true} />
          <ExpandedMenuItem
            onClick={handleChangePinClick}
            label={translate('walletProvider.keepKey.settings.menuLabels.pin')}
            value='********'
            hasSubmenu={true}
          />
          <MenuDivider />
        </MenuGroup>
        <MenuGroup title={'Advanced'} ml={3} color='gray.500'>
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.deviceTimeout')}
            value='10 Minutes'
            hasSubmenu={true}
          />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.pinCaching')}
            hasSubmenu={true}
            value={getBooleanLabel(wallet.features.pinCached)}
            valueDisposition={wallet.features.pinCached ? 'positive' : 'neutral'}
          />
          <ExpandedMenuItem
            label={translate('walletProvider.keepKey.settings.menuLabels.passphrase')}
            value={getBooleanLabel(wallet.features.passphraseProtection)}
            valueDisposition={wallet.features.passphraseProtection ? 'positive' : 'neutral'}
            hasSubmenu={true}
          />
          <MenuDivider />
          <MenuItem color='red.500' icon={<CloseIcon />}>
            {translate('walletProvider.keepKey.settings.menuLabels.wipeDevice')}
          </MenuItem>
        </MenuGroup>
      </>
    )
    return keepKeyStateLoaded || keepKeyStateLoading
  }

  const changePin = () => {
    const renderPinState: JSX.Element = (() => {
      return (
        <>
          {pinUpdateStatus && (
            <Alert
              status={pinUpdateStatus === 'success' ? 'success' : 'error'}
              borderRadius='lg'
              mb={3}
              fontWeight='semibold'
              color={pinUpdateStatus === 'success' ? 'green.200' : 'yellow.200'}
              fontSize='sm'
            >
              <AlertIcon color={pinUpdateStatus === 'success' ? 'green.200' : 'yellow.200'} />
              {pinUpdateStatus === 'success'
                ? translate('walletProvider.keepKey.settings.descriptions.pinUpdateSuccess')
                : translate('walletProvider.keepKey.settings.descriptions.pinUpdateFailed')}
            </Alert>
          )}
          {awaitingButtonPress ? (
            <Flex>
              <InfoIcon color='blue.200' mt={1} />
              <Text
                translation='walletProvider.keepKey.settings.descriptions.pinButtonPrompt'
                ml={3}
                fontWeight='medium'
                color='blue.200'
              />
            </Flex>
          ) : (
            <Button colorScheme='blue' size='sm' onClick={handleChangePinInitializeEvent}>
              {translate('walletProvider.keepKey.settings.actions.updatePin')}
            </Button>
          )}
        </>
      )
    })()

    return (
      <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
        <SubmenuHeader
          title={translate('walletProvider.keepKey.settings.headings.devicePin')}
          description={translate('walletProvider.keepKey.settings.descriptions.pin')}
        />
        {renderPinState}
      </Flex>
    )
  }

  return (
    <>
      <Route exact path={WalletConnectedRoutes.KeepKey} component={keepKeyMenu} />
      <Route exact path={WalletConnectedRoutes.KeepKeyPin} component={changePin} />
    </>
  )
}
