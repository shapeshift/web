import { ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Flex } from '@chakra-ui/react'
import { Features } from '@keepkey/device-protocol/lib/messages_pb'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey/dist/keepkey'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useLocation } from 'react-router-dom'
import { ExpandedMenuItem } from 'components/Layout/Header/NavBar/ExpandedMenuItem'
import { useMenuRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { WalletConnectedProps, WalletImage } from 'components/Layout/Header/NavBar/UserMenu'
import { RawText, Text } from 'components/Text'
import { KeyManager } from 'context/WalletProvider/config'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const WalletConnectedMenuRoutes = ({
  onDisconnect,
  onSwitchProvider,
  walletInfo,
  isConnected,
  type
}: WalletConnectedProps) => {
  const { handleKeepKeyClick } = useMenuRoutes()
  const location = useLocation()
  const translate = useTranslate()
  const [walletFeatures, setWalletFeatures] = useState<Features.AsObject>()
  const [keepKeyWallet, setKeepKeyWallet] = useState<KeepKeyHDWallet | undefined>()
  const { state: walletState } = useWallet()
  const isKeepKey = type === KeyManager.KeepKey
  const wallet = walletState.wallet

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const features = (await wallet.getFeatures()) as Features.AsObject
      setWalletFeatures(features)
      isKeepKey && setKeepKeyWallet(wallet as KeepKeyHDWallet)
      // await keepKeyWallet?.applySettings({ label: 'Test KeepKey' })
    })()
  }, [isKeepKey, wallet])

  const connectedMenu = () => {
    return (
      <MenuGroup title={translate('common.connectedWallet')} ml={3} color='gray.500'>
        <MenuItem
          closeOnSelect={!isKeepKey}
          onClick={isKeepKey ? handleKeepKeyClick : undefined}
          icon={<WalletImage walletInfo={walletInfo} />}
        >
          <Flex flexDir='row' justifyContent='space-between' alignItems='center'>
            <RawText>{walletInfo?.name}</RawText>
            {!isConnected && (
              <Text
                translation={'connectWallet.menu.disconnected'}
                fontSize='sm'
                color='yellow.500'
              />
            )}
            {isKeepKey && <ChevronRightIcon />}
          </Flex>
        </MenuItem>
        <MenuDivider ml={3} />
        <MenuItem icon={<RepeatIcon />} onClick={onSwitchProvider}>
          {translate('connectWallet.menu.switchWallet')}
        </MenuItem>
        <MenuItem fontWeight='medium' icon={<CloseIcon />} onClick={onDisconnect} color='red.500'>
          {translate('connectWallet.menu.disconnect')}
        </MenuItem>
      </MenuGroup>
    )
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
              <Text mr={3} translation='Loading...' fontSize='sm' color='yellow.500' />
            </Flex>
          </Flex>
        </MenuGroup>
      </>
    )

    const keepKeyStateLoaded = walletFeatures && (
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
            label='Bootloader'
            value='Up to date'
            badge='v3.253'
            badgeColor='green'
            hasSubmenu={true}
          />
          <ExpandedMenuItem
            label='Firmware'
            value='Update available'
            badge='v6.04'
            badgeColor='yellow'
            hasSubmenu={true}
            valueDisposition='info'
          />
          <MenuDivider />
          <ExpandedMenuItem label='Label' value={walletInfo?.name} hasSubmenu={true} />
          <ExpandedMenuItem label='PIN' value='********' hasSubmenu={true} />
          <MenuDivider />
        </MenuGroup>
        <MenuGroup title={'Advanced'} ml={3} color='gray.500'>
          <ExpandedMenuItem label='Device Timeout' value='10 Minutes' hasSubmenu={true} />
          <ExpandedMenuItem
            label='PIN Caching'
            hasSubmenu={true}
            value={walletFeatures.pinCached ? 'Enabled' : 'Disabled'}
            valueDisposition={walletFeatures.pinCached ? 'positive' : 'neutral'}
          />
          <ExpandedMenuItem
            label='Passphrase'
            value={walletFeatures.passphraseProtection ? 'Enabled' : 'Disabled'}
            valueDisposition={walletFeatures.passphraseProtection ? 'positive' : 'neutral'}
            hasSubmenu={true}
          />
          <MenuDivider />
          <MenuItem color='red.500' icon={<CloseIcon />}>
            Wipe Device
          </MenuItem>
        </MenuGroup>
      </>
    )
    return keepKeyStateLoaded || keepKeyStateLoading
  }

  return (
    <Switch location={location} key={location.key}>
      <Route path='/connected' component={connectedMenu} />
      <Route path='/keepkey' component={keepKeyMenu} />
    </Switch>
  )
}
