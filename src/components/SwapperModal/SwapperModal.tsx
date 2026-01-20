import type { AssetId } from '@shapeshiftoss/caip'
import { memo, useCallback } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { SwapperModalContent } from './SwapperModalContent'

import { Display } from '@/components/Display'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch } from '@/state/store'

type SwapperModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultBuyAssetId?: AssetId
  defaultSellAssetId?: AssetId
}

const initialEntries = [
  { pathname: TradeRoutePaths.Input },
  { pathname: TradeRoutePaths.Confirm },
  { pathname: TradeRoutePaths.VerifyAddresses },
  { pathname: TradeRoutePaths.QuoteList },
]

export const SwapperModal = memo(
  ({ isOpen, onClose, onSuccess, defaultBuyAssetId, defaultSellAssetId }: SwapperModalProps) => {
    const dispatch = useAppDispatch()

    const handleClose = useCallback(() => {
      dispatch(tradeInput.actions.clear())
      onClose()
    }, [dispatch, onClose])

    return (
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        height='auto'
        modalProps={{
          closeOnOverlayClick: true,
          size: { base: 'full', md: 'md' },
        }}
      >
        <Display.Mobile>
          <DialogHeader>
            <DialogHeader.Left>{null}</DialogHeader.Left>
            <DialogHeader.Middle>
              <DialogTitle>Trade</DialogTitle>
            </DialogHeader.Middle>
            <DialogHeader.Right>
              <DialogCloseButton />
            </DialogHeader.Right>
          </DialogHeader>
        </Display.Mobile>
        <DialogBody py={0} px={{ base: 4, md: 0 }} flex={1} display='flex' flexDirection='column'>
          {isOpen && (
            <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
              <SwapperModalContent
                defaultBuyAssetId={defaultBuyAssetId}
                defaultSellAssetId={defaultSellAssetId}
                onSuccess={onSuccess}
              />
            </MemoryRouter>
          )}
        </DialogBody>
      </Dialog>
    )
  },
)
