import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import { DialogHeader } from 'components/Modal/components/DialogHeader'
import { DialogTitle } from 'components/Modal/components/DialogTitle'

type SelectAssetsProps = {
  onClick(assetId: AssetId): void
  onBack?: () => void
}

export const SelectAssets = ({ onClick }: SelectAssetsProps) => {
  const translate = useTranslate()
  const handleClick = useCallback((asset: Asset) => onClick(asset.assetId), [onClick])
  return (
    <>
      <DialogHeader>
        <DialogHeader.Left>
          <DialogCloseButton />
        </DialogHeader.Left>
        <DialogHeader.Middle>
          <DialogTitle>{translate('common.selectAsset')}</DialogTitle>
        </DialogHeader.Middle>
      </DialogHeader>
      <DialogBody height='600px' px={2} display='flex' flexDir='column' flex='auto'>
        <AssetSearch onClick={handleClick} />
      </DialogBody>
    </>
  )
}
