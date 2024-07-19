import React, { lazy, memo } from 'react'
import { makeSuspenseful } from 'utils/makeSuspenseful'

import { createModalProviderInner } from './ModalContainer'
import type { Modals } from './types'

const ReceiveModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/Receive/Receive').then(({ ReceiveModal }) => ({
      default: ReceiveModal,
    })),
  ),
)

const QrCodeModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/QrCode/QrCode').then(({ QrCodeModal }) => ({
      default: QrCodeModal,
    })),
  ),
)

const SendModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/Send/Send').then(({ SendModal }) => ({
      default: SendModal,
    })),
  ),
)

const PopupWindowModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/PopupWindowModal').then(({ PopupWindowModal }) => ({
      default: PopupWindowModal,
    })),
  ),
)

const FiatRampsModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/FiatRamps/FiatRampsModal').then(({ FiatRampsModal }) => ({
      default: FiatRampsModal,
    })),
  ),
)

const SettingsModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/Settings/Settings').then(({ SettingsModal }) => ({
      default: SettingsModal,
    })),
  ),
)

const WipeModal = makeSuspenseful(
  lazy(() =>
    import('components/Layout/Header/NavBar/KeepKey/Modals/Wipe').then(({ WipeModal }) => ({
      default: WipeModal,
    })),
  ),
)

const BackupPassphraseModal = makeSuspenseful(
  lazy(() =>
    import(
      'components/Layout/Header/NavBar/Native/BackupPassphraseModal/BackupPassphraseModal'
    ).then(({ BackupPassphraseModal }) => ({
      default: BackupPassphraseModal,
    })),
  ),
)

const MobileWelcomeModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/MobileWelcome/MobileWelcomeModal').then(({ MobileWelcomeModal }) => ({
      default: MobileWelcomeModal,
    })),
  ),
)

const AddAccountModal = makeSuspenseful(
  lazy(() =>
    import('pages/Accounts/AddAccountModal').then(({ AddAccountModal }) => ({
      default: AddAccountModal,
    })),
  ),
)

const AssetSearchModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/AssetSearch/AssetSearchModal').then(({ AssetSearchModal }) => ({
      default: AssetSearchModal,
    })),
  ),
)

const BuyAssetSearchModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/AssetSearch/AssetSearchModal').then(({ BuyAssetSearchModal }) => ({
      default: BuyAssetSearchModal,
    })),
  ),
)

const SellAssetSearchModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/AssetSearch/AssetSearchModal').then(({ SellAssetSearchModal }) => ({
      default: SellAssetSearchModal,
    })),
  ),
)

const BuyTradeAssetSearchModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/TradeAssetSearch/TradeAssetSearchModal').then(
      ({ BuyTradeAssetSearchModal }) => ({
        default: BuyTradeAssetSearchModal,
      }),
    ),
  ),
)

const SellTradeAssetSearchModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/TradeAssetSearch/TradeAssetSearchModal').then(
      ({ SellTradeAssetSearchModal }) => ({
        default: SellTradeAssetSearchModal,
      }),
    ),
  ),
)

const NativeOnboarding = makeSuspenseful(
  lazy(() =>
    import('components/Modals/NativeOnboarding/NativeOnboarding').then(({ NativeOnboarding }) => ({
      default: NativeOnboarding,
    })),
  ),
)

const NftModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/Nfts/NftModal').then(({ NftModal }) => ({
      default: NftModal,
    })),
  ),
)

const FeedbackAndSupport = makeSuspenseful(
  lazy(() =>
    import('components/Modals/FeedbackSupport/FeedbackSupport').then(({ FeedbackAndSupport }) => ({
      default: FeedbackAndSupport,
    })),
  ),
)

const Snaps = makeSuspenseful(
  lazy(() =>
    import('components/Modals/Snaps/Snaps').then(({ Snaps }) => ({
      default: Snaps,
    })),
  ),
)

const ManageAccountsModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/ManageAccounts/ManageAccountsModal').then(
      ({ ManageAccountsModal }) => ({
        default: ManageAccountsModal,
      }),
    ),
  ),
)

const LedgerOpenAppModal = makeSuspenseful(
  lazy(() =>
    import('components/Modals/LedgerOpenApp/LedgerOpenAppModal').then(({ LedgerOpenAppModal }) => ({
      default: LedgerOpenAppModal,
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
  buyTradeAssetSearch: BuyTradeAssetSearchModal,
  sellTradeAssetSearch: SellTradeAssetSearchModal,
  nativeOnboard: NativeOnboarding,
  nft: NftModal,
  feedbackSupport: FeedbackAndSupport,
  snaps: Snaps,
  manageAccounts: ManageAccountsModal,
  ledgerOpenApp: LedgerOpenAppModal,
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
