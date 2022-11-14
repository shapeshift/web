import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useMediaQuery,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AssetSearchProps } from 'components/AssetSearch/AssetSearch'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { useModal } from 'hooks/useModal/useModal'
import { useWindowSize } from 'hooks/useWindowSize/useWindowSize'
import { breakpoints } from 'theme/theme'

export const AssetSearchModal = ({ onClick, filterBy, disableUnsupported }: AssetSearchProps) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { height: windowHeight } = useWindowSize()
  const {
    assetSearch: { close, isOpen },
  } = useModal()
  const handleClick = useCallback(
    (asset: Asset) => {
      onClick(asset)
      close()
    },
    [close, onClick],
  )
  const modalHeight = windowHeight
    ? // Converts pixel units to vh for Modal component
      Math.min(Math.round((680 / windowHeight) * 100), 80)
    : 80
  return (
    <Modal isOpen={isOpen} onClose={close} isCentered={isLargerThanMd} trapFocus={false}>
      <ModalOverlay />
      <ModalContent height={`${modalHeight}vh`}>
        <ModalHeader>{translate('common.selectAsset')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={2} display='flex' flexDir='column'>
          <AssetSearch
            onClick={handleClick}
            filterBy={filterBy}
            disableUnsupported={disableUnsupported}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
