import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, ModalBody, ModalCloseButton, ModalHeader, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { SlideTransition } from 'components/SlideTransition'

type SelectAssetsProps = {
  onClick(assetId: AssetId): void
  onBack?: () => void
}

export const SelectAssets = ({ onClick: handleClick, onBack: handleBack }: SelectAssetsProps) => {
  const translate = useTranslate()
  return (
    <SlideTransition>
      <Stack direction='row' width='full' alignItems='center' px={4}>
        <IconButton
          variant='ghost'
          icon={<ArrowBackIcon />}
          aria-label={translate('common.back')}
          fontSize='xl'
          size='sm'
          isRound
          onClick={handleBack}
        />
        <ModalHeader textAlign='center' flex={1}>
          {translate('common.selectAsset')}
        </ModalHeader>
        <ModalCloseButton position='static' />
      </Stack>
      <ModalBody height='600px' px={2} display='flex' flexDir='column'>
        <AssetSearch onClick={asset => handleClick(asset.assetId)} />
      </ModalBody>
    </SlideTransition>
  )
}
