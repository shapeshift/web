import type { ComponentWithAs, IconProps } from '@chakra-ui/react'
import * as keepkeyTcp from '@shapeshiftoss/hdwallet-keepkey-tcp'
import type { RouteProps } from 'react-router-dom'
import { WalletConnectedRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { ChangeLabel } from 'components/Layout/Header/NavBar/KeepKey/ChangeLabel'
import { ChangePassphrase } from 'components/Layout/Header/NavBar/KeepKey/ChangePassphrase'
import { ChangePin } from 'components/Layout/Header/NavBar/KeepKey/ChangePin'
import { ChangeTimeout } from 'components/Layout/Header/NavBar/KeepKey/ChangeTimeout'
import { KeepKeyMenu } from 'components/Layout/Header/NavBar/KeepKey/KeepKeyMenu'

import { KeepKeyDownloadUpdaterApp } from './KeepKey/components/DownloadUpdaterApp'
import { KeepKeyFactoryState } from '../../components/Modals/UpdateKeepKey/FactoryState'
import { KeepKeyLabel } from './KeepKey/components/Label'
import { KeepKeyPassphrase } from './KeepKey/components/Passphrase'
import { KeepKeyPinModal } from './KeepKey/components/PinModal'
import { KeepKeyRecoverySentence } from './KeepKey/components/RecoverySentence'
import { KeepKeyRecoverySentenceEntry } from './KeepKey/components/RecoverySentenceEntry'
import { KeepKeyRecoverySentenceInvalid } from './KeepKey/components/RecoverySentenceInvalid'
import { KeepKeyRecoverySettings } from './KeepKey/components/RecoverySettings'
import { RecoverySettingUp } from './KeepKey/components/RecoverySettingUp'
import { KeepKeySuccess } from './KeepKey/components/Success'
import { KeepKeyConfig } from './KeepKey/config'
import { KeyManager } from './KeyManager'
import { KeepKeyRoutes } from './routes'
import { UpdateKeepKey } from 'components/Modals/UpdateKeepKey/UpdateKeepKey'
export interface SupportedWalletInfo {
  adapter: any
  supportsMobile?: 'browser' | 'app' | 'both'
  icon: ComponentWithAs<'svg', IconProps>
  name: string
  routes: RouteProps[]
  connectedWalletMenuRoutes?: RouteProps[]
  connectedWalletMenuInitialPath?: WalletConnectedRoutes
}

export const SUPPORTED_WALLETS: Record<KeyManager, SupportedWalletInfo> = {
  [KeyManager.KeepKey]: {
    ...KeepKeyConfig,
    adapter: keepkeyTcp.TCPKeepKeyAdapter,
    routes: [
      { path: KeepKeyRoutes.Success, component: KeepKeySuccess },
      { path: KeepKeyRoutes.Pin, component: KeepKeyPinModal },
      { path: KeepKeyRoutes.Passphrase, component: KeepKeyPassphrase },
      { path: KeepKeyRoutes.FactoryState, component: UpdateKeepKey },
      { path: KeepKeyRoutes.NewLabel, component: KeepKeyLabel },
      { path: KeepKeyRoutes.NewRecoverySentence, component: KeepKeyRecoverySentence },
      { path: KeepKeyRoutes.RecoverySentenceEntry, component: KeepKeyRecoverySentenceEntry },
      { path: KeepKeyRoutes.RecoverySettings, component: KeepKeyRecoverySettings },
      { path: KeepKeyRoutes.RecoverySettingUp, component: RecoverySettingUp },
      { path: KeepKeyRoutes.RecoverySentenceInvalid, component: KeepKeyRecoverySentenceInvalid },
      { path: KeepKeyRoutes.DownloadUpdater, component: KeepKeyDownloadUpdaterApp },
    ],
    connectedWalletMenuRoutes: [
      { path: WalletConnectedRoutes.KeepKey, component: KeepKeyMenu },
      { path: WalletConnectedRoutes.KeepKeyLabel, component: ChangeLabel },
      { path: WalletConnectedRoutes.KeepKeyPin, component: ChangePin },
      { path: WalletConnectedRoutes.KeepKeyTimeout, component: ChangeTimeout },
      { path: WalletConnectedRoutes.KeepKeyPassphrase, component: ChangePassphrase },
    ],
    connectedWalletMenuInitialPath: WalletConnectedRoutes.KeepKey,
  },
}
