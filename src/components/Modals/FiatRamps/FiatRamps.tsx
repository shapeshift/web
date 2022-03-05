import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { MemoryRouter, Route } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { FiatRampsRouter } from './FiatRampsRouter'

export enum FiatRampAction {
  Buy = 'buy',
  Sell = 'sell'
}

export enum TransactionDirection {
  BankToBlockchain = 'bank_blockchain',
  CardToBlockchain = 'card_blockchain',
  BlockchainToBank = 'blockchain_bank'
}

export type CurrencyFee = {
  additional: string | null
  additional_currency: string | null
  default: boolean
  percentage: number
  subtype: string
  type: string
}

export type SupportedCurrency = {
  destination: {
    currencies: CurrencyAsset[]
  }
  source: {
    currencies: CurrencyAsset[]
  }
  institution_id: 'coinify' | 'wyre'
  transaction_direction: TransactionDirection
}

// Non-exhaustive typings. We do not want to keep this a 1/1 mapping to an external API
// There could be breaking changes with other fields and that's fine, these are the only ones we need
export type CurrencyAsset = {
  gem_asset_id: string
  name: string
  ticker: string
  cryptoBalance?: number
  fiatBalance?: number
}

export enum FiatRampsRoutes {
  Select = '/fiat-ramp/select',
  Gem = '/fiat-ramp/gem'
}

export const entries = [FiatRampsRoutes.Select, FiatRampsRoutes.Gem]

export const FiatRampsModal = () => {
  const { fiatRamps } = useModal()
  const { close, isOpen } = fiatRamps
  return (
    <Modal isOpen={isOpen} onClose={close} isCentered variant='fluid'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <MemoryRouter initialEntries={entries}>
          <Route path='/'>
            <FiatRampsRouter />
          </Route>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
