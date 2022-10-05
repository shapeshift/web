import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { useModal } from 'hooks/useModal/useModal'

type AssetSearchModalProps = {
  onClick: (asset: Asset) => void
  filterBy?: (assets: Asset[]) => Asset[] | undefined
}

export const AssetSearchModal = ({ onClick, filterBy }: AssetSearchModalProps) => {
  const { assetSearch } = useModal()
  const { close, isOpen } = assetSearch
  const handleClick = (asset: Asset) => {
    onClick(asset)
    close()
  }
  const windowHeight = window.innerHeight
  let modalHeight = Math.min(Math.round((680 / windowHeight) * 100), 80)
  return (
    <Modal isOpen={isOpen} onClose={close} isCentered trapFocus={false}>
      <ModalOverlay />
      <ModalContent height={`${modalHeight}vh`}>
        <ModalHeader>Select</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={2} height={modalHeight} display='flex' flexDir='column'>
          <AssetSearch onClick={handleClick} filterBy={filterBy} />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
