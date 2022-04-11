import { ChevronRightIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import { MenuDivider, MenuGroup, MenuItem } from '@chakra-ui/menu'
import { Flex } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route, Switch, useLocation } from 'react-router-dom'
import {
  useMenuRoutes,
  WalletConnectedRoutes,
} from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { ChangeLabel } from 'components/Layout/Header/NavBar/KeepKey/ChangeLabel'
import { ChangePassphrase } from 'components/Layout/Header/NavBar/KeepKey/ChangePassphrase'
import { ChangePin } from 'components/Layout/Header/NavBar/KeepKey/ChangePin'
import { ChangePinCaching } from 'components/Layout/Header/NavBar/KeepKey/ChangePinCaching'
import { ChangeTimeout } from 'components/Layout/Header/NavBar/KeepKey/ChangeTimeout'
import { KeepKeyMenu } from 'components/Layout/Header/NavBar/KeepKey/KeepKeyMenu'
import { SubMenuContainer } from 'components/Layout/Header/NavBar/SubMenuContainer'
import { WalletConnectedProps } from 'components/Layout/Header/NavBar/UserMenu'
import { WalletImage } from 'components/Layout/Header/NavBar/WalletImage'
import { RawText, Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { ReduxState } from 'state/reducer'
import { selectFeatureFlag } from 'state/slices/preferencesSlice/selectors'

export const WalletConnectedMenu = ({
  onDisconnect,
  onSwitchProvider,
  walletInfo,
  isConnected,
}: WalletConnectedProps) => {
  const { navigateToRoute } = useMenuRoutes()
  const location = useLocation()
  const translate = useTranslate()
  const { keepKeyWallet } = useKeepKey()
  const keepKeySettingsFlag = useSelector((state: ReduxState) =>
    selectFeatureFlag(state, 'KeepKeySettings'),
  )

  const ConnectedMenu = () => {
    return (
      <MenuGroup title={translate('common.connectedWallet')} ml={3} color='gray.500'>
        <MenuItem
          closeOnSelect={!keepKeyWallet}
          onClick={
            keepKeySettingsFlag && keepKeyWallet
              ? () => navigateToRoute(WalletConnectedRoutes.KeepKey)
              : undefined
          }
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
            {keepKeySettingsFlag && keepKeyWallet && <ChevronRightIcon />}
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

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path={WalletConnectedRoutes.Connected}>
          <SubMenuContainer>
            <ConnectedMenu />
          </SubMenuContainer>
        </Route>
        <Route exact path={WalletConnectedRoutes.KeepKey} component={KeepKeyMenu} />
        <Route exact path={WalletConnectedRoutes.KeepKeyLabel} component={ChangeLabel} />
        <Route exact path={WalletConnectedRoutes.KeepKeyPin} component={ChangePin} />
        <Route exact path={WalletConnectedRoutes.KeepKeyTimeout} component={ChangeTimeout} />
        <Route exact path={WalletConnectedRoutes.KeepKeyPinCaching} component={ChangePinCaching} />
        <Route exact path={WalletConnectedRoutes.KeepKeyPassphrase} component={ChangePassphrase} />
      </Switch>
    </AnimatePresence>
  )
}
