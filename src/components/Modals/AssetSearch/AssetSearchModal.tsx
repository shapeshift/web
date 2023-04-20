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
import type { FC } from 'react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AssetSearchProps } from 'components/AssetSearch/AssetSearch'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { useWindowSize } from 'hooks/useWindowSize/useWindowSize'
import { breakpoints } from 'theme/theme'

interface AssetSearchModalProps extends AssetSearchProps {
  isOpen: boolean
  title?: string
  onClick: Required<AssetSearchProps>['onClick']
  onClose: () => void
}

export const AssetSearchModal: FC<AssetSearchModalProps> = ({
  assets,
  disableUnsupported,
  isOpen,
  title = 'common.selectAsset',
  onClick,
  onClose,
}) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { height: windowHeight } = useWindowSize()

  const handleClick = useCallback(
    (asset: Asset) => {
      onClick(asset)
      onClose()
    },
    [onClose, onClick],
  )

  const modalHeight = windowHeight
    ? // Converts pixel units to vh for Modal component
      Math.min(Math.round((680 / windowHeight) * 100), 80)
    : 80

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered={isLargerThanMd} trapFocus={false}>
      <ModalOverlay />
      <ModalContent height={`${modalHeight}vh`}>
        <ModalHeader>{translate(title)}</ModalHeader>
        <ModalCloseButton />
        <ModalBody px={2} pt={0} pb={0} display='flex' flexDir='column'>
          <AssetSearch
            onClick={handleClick}
            assets={assets}
            disableUnsupported={disableUnsupported}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
