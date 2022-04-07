import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { BigNumber } from 'lib/bignumber/bignumber'

import { FiatRampsRouter } from './FiatRampsRouter'

export enum TransactionDirection {
  BankToBlockchain = 'bank_blockchain',
  CardToBlockchain = 'card_blockchain',
  BlockchainToBank = 'blockchain_bank'
}

export type SupportedCurrency = {
  destination: {
    currencies: GemCurrency[]
  }
  source: {
    currencies: GemCurrency[]
  }
  transaction_direction: TransactionDirection
}

// Non-exhaustive typings. We do not want to keep this a 1/1 mapping to an external API
// There could be breaking changes with other fields and that's fine, these are the only ones we need
export type GemCurrency = {
  gem_asset_id: string
  name: string
  ticker: string
  assetId: string
  cryptoBalance: BigNumber
  fiatBalance: BigNumber
  disabled?: boolean
}

export enum FiatRampsRoutes {
  Select = '/fiat-ramp/select',
  Gem = '/fiat-ramp/gem'
}

export const entries = [FiatRampsRoutes.Select, FiatRampsRoutes.Gem]

export enum FiatRampAction {
  Buy = 'buy',
  Sell = 'sell'
}

export const FiatRampsModal = () => {
  const { fiatRamps } = useModal()
  const { close, isOpen } = fiatRamps
  return (
    <Modal isOpen={isOpen} onClose={close} isCentered variant='fluid'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <MemoryRouter initialEntries={entries}>
          <FiatRampsRouter />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
