import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'
import { TradeAssetSearch } from 'components/TradeAssetSearch/TradeAssetSearch'

type SelectAssetsProps = {
  onClick(assetId: AssetId): void
  onBack?: () => void
}

export const SelectAssets = ({ onClick }: SelectAssetsProps) => {
  const translate = useTranslate()
  const handleAssetClick = useCallback((asset: Asset) => onClick(asset.assetId), [onClick])
  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>{translate('common.selectAsset')}</DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody height='600px' px={2} display='flex' flexDir='column'>
        <TradeAssetSearch onAssetClick={handleAssetClick} />
      </DialogBody>
    </SlideTransition>
  )
}
