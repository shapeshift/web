import { ModalBody, ModalCloseButton, ModalHeader } from '@chakra-ui/react'
import { RouteComponentProps } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { SlideTransition } from 'components/SlideTransition'

export type Asset = {}

type SelectAssetsProps = {
  onClick(asset: Asset): void
} & RouteComponentProps

export const SelectAssets = ({ onClick }: SelectAssetsProps) => {
  return (
    <SlideTransition>
      <ModalCloseButton />
      <ModalHeader textAlign='center'>Select an Asset</ModalHeader>
      <ModalBody height='600px' px={2} display='flex' flexDir='column'>
        <AssetSearch onClick={onClick} />
      </ModalBody>
    </SlideTransition>
  )
}
