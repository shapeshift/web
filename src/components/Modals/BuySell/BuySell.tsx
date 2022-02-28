import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { BuySellRouter } from './BuySellRouter'

export enum BuySellRamp {
  Gem = 'gem',
  OnJuno = 'onjuno'
}

export enum BuySellAction {
  Buy = 'buy',
  Sell = 'sell'
}

export enum InstitutionType {
  Coinify = 'coinify',
  Wyre = 'wyre'
}

export enum TransactionDirection {
  BankToBlockchain = 'bank_blockchain',
  CardToBlockchain = 'card_blockchain',
  BlockchainToBank = 'card_blockchain'
}

export type CurrencyFee = {
  additional: string | null
  additional_currency: string | null
  default: boolean
  percentage: number
  subtype: string
  type: string
}

export type Medium = {
  Blockchain: 'blockchain'
  Bank: 'bank'
}

export type SupportedCurrency = {
  destination: {
    currencies: CurrencyAsset[]
    medium: Medium
    minimums?: { [x: string]: number }
  }
  fees: CurrencyFee[]
  institution_id: 'coinify' | 'wyre'
  resolved_destination_currency_count: number
  resolved_source_currency_count: number
  source: {
    currencies: CurrencyAsset[]
    medium: Medium
    minimums?: { [x: string]: number }
  }
  supported_destination_currency_count: number
  supported_source_currency_count: number
  transaction_direction: TransactionDirection
}

export type CurrencyAsset = {
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
