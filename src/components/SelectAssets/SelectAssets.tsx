import { ArrowBackIcon } from '@chakra-ui/icons'
import { IconButton, ModalBody, ModalCloseButton, ModalHeader, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { SlideTransition } from 'components/SlideTransition'

export type Asset = {}

type SelectAssetsProps = {
  onClick(asset: Asset): void
  onBack?: () => void
} & RouteComponentProps

export const SelectAssets = ({ onClick, onBack: handleBack }: SelectAssetsProps) => {
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
        <AssetSearch onClick={onClick} />
      </ModalBody>
    </SlideTransition>
  )
}
