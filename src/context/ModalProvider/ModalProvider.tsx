import React, { lazy, memo } from 'react'
import { makeSuspsenseful } from 'utils/makeSuspenseful'

import { createModalProviderInner } from './ModalContainer'
import type { Modals } from './types'

const ReceiveModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/Receive/Receive').then(({ ReceiveModal }) => ({
      default: ReceiveModal,
    })),
  ),
)

const QrCodeModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/QrCode/QrCode').then(({ QrCodeModal }) => ({
      default: QrCodeModal,
    })),
  ),
)

const SendModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/Send/Send').then(({ SendModal }) => ({
      default: SendModal,
    })),
  ),
)

const PopupWindowModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/PopupWindowModal').then(({ PopupWindowModal }) => ({
      default: PopupWindowModal,
    })),
  ),
)

const FiatRampsModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/FiatRamps/FiatRampsModal').then(({ FiatRampsModal }) => ({
      default: FiatRampsModal,
    })),
  ),
)

const SettingsModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/Settings/Settings').then(({ SettingsModal }) => ({
      default: SettingsModal,
    })),
  ),
)

const WipeModal = makeSuspsenseful(
  lazy(() =>
    import('components/Layout/Header/NavBar/KeepKey/Modals/Wipe').then(({ WipeModal }) => ({
      default: WipeModal,
    })),
  ),
)

const BackupPassphraseModal = makeSuspsenseful(
  lazy(() =>
    import(
      'components/Layout/Header/NavBar/Native/BackupPassphraseModal/BackupPassphraseModal'
    ).then(({ BackupPassphraseModal }) => ({
      default: BackupPassphraseModal,
    })),
  ),
)

const MobileWelcomeModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/MobileWelcome/MobileWelcomeModal').then(({ MobileWelcomeModal }) => ({
      default: MobileWelcomeModal,
    })),
  ),
)

const AddAccountModal = makeSuspsenseful(
  lazy(() =>
    import('pages/Accounts/AddAccountModal').then(({ AddAccountModal }) => ({
      default: AddAccountModal,
    })),
  ),
)

const AssetSearchModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/AssetSearch/AssetSearchModal').then(({ AssetSearchModal }) => ({
      default: AssetSearchModal,
    })),
  ),
)

const BuyAssetSearchModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/AssetSearch/AssetSearchModal').then(({ BuyAssetSearchModal }) => ({
      default: BuyAssetSearchModal,
    })),
  ),
)

const SellAssetSearchModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/AssetSearch/AssetSearchModal').then(({ SellAssetSearchModal }) => ({
      default: SellAssetSearchModal,
    })),
  ),
)

const NativeOnboarding = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/NativeOnboarding/NativeOnboarding').then(({ NativeOnboarding }) => ({
      default: NativeOnboarding,
    })),
  ),
)

const NftModal = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/Nfts/NftModal').then(({ NftModal }) => ({
      default: NftModal,
    })),
  ),
)

const FeedbackAndSupport = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/FeedbackSupport/FeedbackSupport').then(({ FeedbackAndSupport }) => ({
      default: FeedbackAndSupport,
    })),
  ),
)

const Snaps = makeSuspsenseful(
  lazy(() =>
    import('components/Modals/Snaps/Snaps').then(({ Snaps }) => ({
      default: Snaps,
    })),
  ),
)

const MODALS: Modals = {
  receive: ReceiveModal,
  qrCode: QrCodeModal,
  send: SendModal,
  popup: PopupWindowModal,
  fiatRamps: FiatRampsModal,
  settings: SettingsModal,
  keepKeyWipe: WipeModal,
  backupNativePassphrase: BackupPassphraseModal,
  mobileWelcomeModal: MobileWelcomeModal,
  addAccount: AddAccountModal,
  assetSearch: AssetSearchModal,
  buyAssetSearch: BuyAssetSearchModal,
  sellAssetSearch: SellAssetSearchModal,
  nativeOnboard: NativeOnboarding,
  nft: NftModal,
  feedbackSupport: FeedbackAndSupport,
  snaps: Snaps,
} as const

export const createModalProvider = () => {
  const providers = Object.entries(MODALS).map(([key, Component]) => {
    return createModalProviderInner({ key: key as keyof Modals, Component })
  })

  return memo(({ children }: { children: React.ReactNode }) => (
    <>
      {providers.reduceRight((children, Provider, index) => {
        return <Provider key={index}>{children}</Provider>
      }, children)}
    </>
  ))
}

export const ModalProvider = createModalProvider()
