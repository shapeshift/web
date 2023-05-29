import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Trade } from 'lib/swapper/api'
import { KnownChainIds } from '@shapeshiftoss/types'
import { ethereum, gnosis } from '@shapeshiftoss/chain-adapters'

export type CowSwapQuoteResponse = {
  quote: {
    sellToken: string
    buyToken: string
    receiver: string
    sellAmount: string
    buyAmount: string
    validTo: number
    appData: string
    feeAmount: string
    kind: string
    partiallyFillable: boolean
  }
  from: string
  expiration: string
  id: string
}

export enum CowNetwork {
  Mainnet = 'mainnet',
  Xdai = 'xdai'
}

export type CowChainId = KnownChainIds.EthereumMainnet | KnownChainIds.GnosisMainnet

export type CowswapSupportedChainAdapter = ethereum.ChainAdapter | gnosis.ChainAdapter

export type CowSwapGetOrdersResponse = {
  status: string
}

export type CowSwapGetTradesElement = {
  txHash: string
}

export type CowSwapGetTradesResponse = CowSwapGetTradesElement[]

export interface CowTrade<C extends CowChainId> extends Trade<C> {
  feeAmountInSellTokenCryptoBaseUnit: string
  sellAmountDeductFeeCryptoBaseUnit: string
  minimumBuyAmountAfterFeesCryptoBaseUnit: string
  id: string
}

export type CowswapExecuteTradeInput<T extends CowChainId> = {
  trade: CowTrade<T>
  wallet: HDWallet
}
