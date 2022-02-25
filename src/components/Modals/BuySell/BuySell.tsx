import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { BuySellRouter } from './BuySellRouter'

export enum BuySellProvider {
  Gem = 'gem',
  OnJuno = 'onjuno'
}

export enum BuySellAction {
  Buy = 'buy',
  Sell = 'sell'
}

export type BuySellAsset = {
  created_at: string
  external_id: string
  gem_asset_id: string
  mapping_id: string
  name: string
  primary_color: string
  rank: number
  resolved: boolean
  source: string
  ticker: string
  transaction_fields: Record<string, never>
  updated_at: string
}

export enum BuySellRoutes {
  Select = '/buysell/select',
  Gem = '/buysell/gem'
}

export const entries = [BuySellRoutes.Select, BuySellRoutes.Gem]

const BuySell = () => {
  const { buysell } = useModal()
  const { close, isOpen } = buysell
  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/'>
              <BuySellRouter />
            </Route>
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
export const BuySellModal = BuySell
