import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useMediaQuery,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { TradeAssetSearchProps } from 'components/TradeAssetSearch/TradeAssetSearch'
import { TradeAssetSearch } from 'components/TradeAssetSearch/TradeAssetSearch'
import { useModal } from 'hooks/useModal/useModal'
import { useWindowSize } from 'hooks/useWindowSize/useWindowSize'
import { breakpoints } from 'theme/theme'

export type TradeAssetSearchModalProps = TradeAssetSearchProps & {
  title?: string
  onAssetClick: Required<TradeAssetSearchProps>['onAssetClick']
}

type AssetSearchModalBaseProps = TradeAssetSearchModalProps & {
  isOpen: boolean
  close: () => void
}

export const TradeAssetSearchModalBase: FC<AssetSearchModalBaseProps> = ({
  onAssetClick,
  close,
  isOpen,
  allowWalletUnsupportedAssets,
  title = 'common.selectAsset',
}) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { height: windowHeight } = useWindowSize()

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      onAssetClick(asset)
      close()
    },
    [close, onAssetClick],
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
        <TradeAssetSearch
          onAssetClick={handleAssetClick}
          allowWalletUnsupportedAssets={allowWalletUnsupportedAssets}
        />
      </ModalContent>
    </Modal>
  )
}

// multiple instances to prevent rerenders opening the modal in different parts of the app

export const SellTradeAssetSearchModal: FC<TradeAssetSearchModalProps> = memo(props => {
  const sellAssetSearch = useModal('sellTradeAssetSearch')
  return <TradeAssetSearchModalBase {...props} {...sellAssetSearch} />
})

export const BuyTradeAssetSearchModal: FC<TradeAssetSearchModalProps> = memo(props => {
  const buyAssetSearch = useModal('buyTradeAssetSearch')
  // Assets unsupported by the wallet are allowed when buying
  return <TradeAssetSearchModalBase {...props} {...buyAssetSearch} allowWalletUnsupportedAssets />
})
