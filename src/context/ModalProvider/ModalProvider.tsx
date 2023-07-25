import React from 'react'
import { WipeModal } from 'components/Layout/Header/NavBar/KeepKey/Modals/Wipe'
import { BackupPassphraseModal } from 'components/Layout/Header/NavBar/Native/BackupPassphraseModal/BackupPassphraseModal'
import {
  AssetSearchModal,
  BuyAssetSearchModal,
  SellAssetSearchModal,
} from 'components/Modals/AssetSearch/AssetSearchModal'
import { FeedbackAndSupport } from 'components/Modals/FeedbackSupport/FeedbackSupport'
import { FiatRampsModal } from 'components/Modals/FiatRamps/FiatRampsModal'
import { MobileWelcomeModal } from 'components/Modals/MobileWelcome/MobileWelcomeModal'
import { NativeOnboarding } from 'components/Modals/NativeOnboarding/NativeOnboarding'
import { NftModal } from 'components/Modals/Nfts/NftModal'
import { PopupWindowModal } from 'components/Modals/PopupWindowModal'
import { QrCodeModal } from 'components/Modals/QrCode/QrCode'
import { ReceiveModal } from 'components/Modals/Receive/Receive'
import { SendModal } from 'components/Modals/Send/Send'
import { SettingsModal } from 'components/Modals/Settings/Settings'
import { AddAccountModal } from 'pages/Accounts/AddAccountModal'

import { createModalProviderInner } from './ModalContainer'
import type { Modals } from './types'

const MODALS: Modals = {
  receive: ReceiveModal,
  qrCode: QrCodeModal,
  send: SendModal,
  fiatRamps: FiatRampsModal,
  settings: SettingsModal,
  keepKeyWipe: WipeModal,
  backupNativePassphrase: BackupPassphraseModal,
  mobileWelcomeModal: MobileWelcomeModal,
  addAccount: AddAccountModal,
  assetSearch: AssetSearchModal,
  buyAssetSearch: BuyAssetSearchModal,
  sellAssetSearch: SellAssetSearchModal,
  popup: PopupWindowModal,
  nativeOnboard: NativeOnboarding,
  nft: NftModal,
  feedbackSupport: FeedbackAndSupport,
} as const

export const createModalProvider = () => {
  let CombinedProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

  Object.entries(MODALS).forEach(([key, Component]) => {
    const InnerProvider = createModalProviderInner({ key: key as keyof Modals, Component })

    const CurrentProvider = CombinedProvider
    CombinedProvider = ({ children }) => (
      <InnerProvider>
        <CurrentProvider>{children}</CurrentProvider>
      </InnerProvider>
    )
  })

  return CombinedProvider
}

export const ModalProvider = createModalProvider()
