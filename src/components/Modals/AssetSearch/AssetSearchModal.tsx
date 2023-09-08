import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useMediaQuery,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AssetSearchProps } from 'components/AssetSearch/AssetSearch'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { useModal } from 'hooks/useModal/useModal'
import { useWindowSize } from 'hooks/useWindowSize/useWindowSize'
import type { Asset } from 'lib/asset-service'
import { breakpoints } from 'theme/theme'

export type AssetSearchModalProps = AssetSearchProps & {
  title?: string
  onClick: Required<AssetSearchProps>['onClick']
}

type AssetSearchModalBaseProps = AssetSearchModalProps & {
  isOpen: boolean
  close: () => void
}

export const AssetSearchModalBase: FC<AssetSearchModalBaseProps> = ({
  onClick,
  close,
  isOpen,
  assets,
  disableUnsupported,
  title = 'common.selectAsset',
}) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { height: windowHeight } = useWindowSize()

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

// multiple instances to prevent rerenders opening the modal in different parts of the app

export const AssetSearchModal: FC<AssetSearchModalProps> = memo(props => {
  const assetSearch = useModal('assetSearch')
  return <AssetSearchModalBase {...props} {...assetSearch} />
})

export const SellAssetSearchModal: FC<AssetSearchModalProps> = memo(props => {
  const sellAssetSearch = useModal('sellAssetSearch')
  return <AssetSearchModalBase {...props} {...sellAssetSearch} />
})

export const BuyAssetSearchModal: FC<AssetSearchModalProps> = memo(props => {
  const buyAssetSearch = useModal('buyAssetSearch')
  return <AssetSearchModalBase {...props} {...buyAssetSearch} />
})
