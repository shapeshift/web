import type { FC } from 'react'
import type { BackupPassphraseModalProps } from 'components/Layout/Header/NavBar/Native/BackupPassphraseModal/BackupPassphraseModal'
import type { AssetSearchModalProps } from 'components/Modals/AssetSearch/AssetSearchModal'
import type { FiatRampsModalProps } from 'components/Modals/FiatRamps/FiatRampsModal'
import type { NftModalProps } from 'components/Modals/Nfts/NftModal'
import type { OpenLedgerAppModalProps } from 'components/Modals/OpenLedgerApp/OpenLedgerAppModal'
import type { PopupWindowModalProps } from 'components/Modals/PopupWindowModal'
import type { QrCodeModalProps } from 'components/Modals/QrCode/QrCode'
import type { ReceivePropsType } from 'components/Modals/Receive/Receive'
import type { SendModalProps } from 'components/Modals/Send/Send'
import type { SnapsModalProps } from 'components/Modals/Snaps/Snaps'
import type { TradeAssetSearchModalProps } from 'components/Modals/TradeAssetSearch/TradeAssetSearchModal'

import type { CLOSE_MODAL, OPEN_MODAL } from './constants'

export type Modals = {
  receive: FC<ReceivePropsType>
  qrCode: FC<QrCodeModalProps>
  send: FC<SendModalProps>
  fiatRamps: FC<FiatRampsModalProps>
  settings: FC<{}>
  keepKeyWipe: FC<{}>
  backupNativePassphrase: FC<BackupPassphraseModalProps>
  mobileWelcomeModal: FC<{}>
  addAccount: FC<{}>
  assetSearch: FC<AssetSearchModalProps>
  buyAssetSearch: FC<AssetSearchModalProps>
  sellAssetSearch: FC<AssetSearchModalProps>
  buyTradeAssetSearch: FC<TradeAssetSearchModalProps>
  sellTradeAssetSearch: FC<TradeAssetSearchModalProps>
  popup: FC<PopupWindowModalProps>
  nativeOnboard: FC<{}>
  nft: FC<NftModalProps>
  feedbackSupport: FC<{}>
  snaps: FC<SnapsModalProps>
  manageAccounts: FC<{}>
  openLedgerApp: FC<OpenLedgerAppModalProps>
}

export type ModalActions<T extends keyof Modals> = OpenModalType<T> | CloseModalType

export type OpenModalType<T extends keyof Modals> = {
  type: typeof OPEN_MODAL
  props: ModalProps<T>
}

export type CloseModalType = {
  type: typeof CLOSE_MODAL
}

export type ModalProps<T extends keyof Modals> = React.ComponentProps<Modals[T]>

export type ModalState<T extends keyof Modals> = {
  props?: ModalProps<T>
  isOpen: boolean
}

export type BaseProps<T extends keyof Modals> = {
  isOpen: boolean
  props?: ModalProps<T>
  open: (props: ModalProps<T>) => void
  close: () => void
}

export type ModalContext = { [key in keyof Modals]: React.Context<BaseProps<key>> }
