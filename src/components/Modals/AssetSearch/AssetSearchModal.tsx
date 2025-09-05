import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import type { AssetSearchProps } from '@/components/AssetSearch/AssetSearch'
import { AssetSearch } from '@/components/AssetSearch/AssetSearch'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { useModal } from '@/hooks/useModal/useModal'

export type AssetSearchModalProps = AssetSearchProps & {
  title?: string
  onAssetClick: Required<AssetSearchProps>['onAssetClick']
}

type AssetSearchModalBaseProps = AssetSearchModalProps & {
  isOpen: boolean
  close: () => void
}

export const AssetSearchModalBase: FC<AssetSearchModalBaseProps> = ({
  onAssetClick,
  close,
  isOpen,
  assets,
  title = 'common.selectAsset',
  allowWalletUnsupportedAssets,
  showRelatedAssets,
}) => {
  const translate = useTranslate()

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      onAssetClick(asset)
      close()
    },
    [close, onAssetClick],
  )
  return (
    <Dialog isOpen={isOpen} onClose={close} isFullScreen>
      <DialogHeader>
        <DialogHeaderMiddle>{translate(title)}</DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <AssetSearch
        onAssetClick={handleAssetClick}
        assets={assets}
        allowWalletUnsupportedAssets={allowWalletUnsupportedAssets}
        showRelatedAssets={showRelatedAssets}
      />
    </Dialog>
  )
}

// multiple instances to prevent rerenders opening the modal in different parts of the app

export const AssetSearchModal: FC<AssetSearchModalProps> = memo(props => {
  const assetSearch = useModal('assetSearch')
  return <AssetSearchModalBase {...props} {...assetSearch} />
})

export const SellAssetSearchModal: FC<AssetSearchModalProps> = memo(props => {
  const sellAssetSearch = useModal('sellAssetSearch')
  return <AssetSearchModalBase {...props} {...sellAssetSearch} />
})

export const BuyAssetSearchModal: FC<AssetSearchModalProps> = memo(props => {
  const buyAssetSearch = useModal('buyAssetSearch')
  // Assets unsupported by the wallet are allowed when buying
  return <AssetSearchModalBase {...props} {...buyAssetSearch} allowWalletUnsupportedAssets />
})
