import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogHeader } from 'components/Modal/components/DialogHeader'

type SelectAssetsProps = {
  onClick(assetId: AssetId): void
  onBack?: () => void
}

const arrowBackIcon = <ArrowBackIcon />

export const SelectAssets = ({ onClick, onBack: handleBack }: SelectAssetsProps) => {
  const translate = useTranslate()
  const handleClick = useCallback((asset: Asset) => onClick(asset.assetId), [onClick])
  return (
    <>
      <DialogHeader textAlign='center'>
        <IconButton
          variant='ghost'
          icon={arrowBackIcon}
          aria-label={translate('common.back')}
          fontSize='xl'
          size='sm'
          isRound
          onClick={handleBack}
        />

        {translate('common.selectAsset')}
      </DialogHeader>
      <DialogBody height='600px' px={2} display='flex' flexDir='column'>
        <AssetSearch onClick={handleClick} />
      </DialogBody>
    </>
  )
}
