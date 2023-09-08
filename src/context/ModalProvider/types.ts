import type { FC } from 'react'
import type { BackupPassphraseModalProps } from 'components/Layout/Header/NavBar/Native/BackupPassphraseModal/BackupPassphraseModal'
import type { AssetSearchModalProps } from 'components/Modals/AssetSearch/AssetSearchModal'
import type { FiatRampsModalProps } from 'components/Modals/FiatRamps/FiatRampsModal'
import type { NftModalProps } from 'components/Modals/Nfts/NftModal'
import type { PopupWindowModalProps } from 'components/Modals/PopupWindowModal'
import type { QrCodeModalProps } from 'components/Modals/QrCode/QrCode'
import type { ReceivePropsType } from 'components/Modals/Receive/Receive'
import type { SendModalProps } from 'components/Modals/Send/Send'

import type { CLOSE_MODAL, OPEN_MODAL } from './constants'

export type Modals = {
  receive: ({ asset, accountId }: ReceivePropsType) => JSX.Element
  qrCode: ({ assetId, accountId }: QrCodeModalProps) => JSX.Element
  send: ({ assetId, accountId, input }: SendModalProps) => JSX.Element
  fiatRamps: FC<FiatRampsModalProps>
  settings: () => JSX.Element
  keepKeyWipe: () => JSX.Element
  backupNativePassphrase: FC<BackupPassphraseModalProps>
  mobileWelcomeModal: () => JSX.Element
  addAccount: () => JSX.Element | null
  assetSearch: FC<AssetSearchModalProps>
  buyAssetSearch: FC<AssetSearchModalProps>
  sellAssetSearch: FC<AssetSearchModalProps>
  popup: React.FC<PopupWindowModalProps>
  nativeOnboard: () => JSX.Element
  nft: React.FC<NftModalProps>
  feedbackSupport: () => JSX.Element
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
