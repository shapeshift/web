import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Dialog } from 'components/Modal/components/Dialog'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import type { TradeAssetSearchProps } from 'components/TradeAssetSearch/TradeAssetSearch'
import { TradeAssetSearch } from 'components/TradeAssetSearch/TradeAssetSearch'
import { useModal } from 'hooks/useModal/useModal'

export type TradeAssetSearchModalProps = TradeAssetSearchProps & {
  title?: string
  onAssetClick: Required<TradeAssetSearchProps>['onAssetClick']
  assetFilterPredicate: (asset: Asset) => boolean
  chainIdFilterPredicate: (chainId: ChainId) => boolean
}

type AssetSearchModalBaseProps = TradeAssetSearchModalProps & {
  isOpen: boolean
  close: () => void
  assetFilterPredicate: (asset: Asset) => boolean
  chainIdFilterPredicate: (chainId: ChainId) => boolean
}

export const TradeAssetSearchModalBase: FC<AssetSearchModalBaseProps> = ({
  onAssetClick,
  close,
  isOpen,
  allowWalletUnsupportedAssets,
  title = 'common.selectAsset',
  assetFilterPredicate,
  chainIdFilterPredicate,
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
      <TradeAssetSearch
        onAssetClick={handleAssetClick}
        allowWalletUnsupportedAssets={allowWalletUnsupportedAssets}
        assetFilterPredicate={assetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
      />
    </Dialog>
  )
}

// multiple instances to prevent rerenders opening the modal in different parts of the app

export const SellTradeAssetSearchModal: FC<TradeAssetSearchModalProps> = memo(props => {
  const sellAssetSearch = useModal('sellTradeAssetSearch')
  return <TradeAssetSearchModalBase {...props} {...sellAssetSearch} />
})

export const BuyTradeAssetSearchModal: FC<TradeAssetSearchModalProps> = memo(props => {
  const buyAssetSearch = useModal('buyTradeAssetSearch')
  // Assets unsupported by the wallet are allowed when buying
  return <TradeAssetSearchModalBase {...props} {...buyAssetSearch} allowWalletUnsupportedAssets />
})
