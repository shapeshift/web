import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import type { BTCSignTx, CosmosSignTx, ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type Web3 from 'web3'

import type { Trade, UtxoSupportedChainIds } from '../../api'

export type ThornodePoolResponse = {
  LP_units: string
  asset: string
  balance_asset: string
  balance_rune: string
  pending_inbound_asset: string
  pending_inbound_rune: string
  pool_units: string
  status: string
  synth_supply: string
  synth_units: string
}

type MidgardCoins = {
  asset: string
}[]

type MidgardActionOut = {
  coins: MidgardCoins
  txID: string
}

type MidgardAction = {
  date: string
  height: string
  out: MidgardActionOut[]
  status: string
  type: string
}

export type MidgardActionsResponse = {
  actions: MidgardAction[]
}

export type InboundAddressResponse = {
  chain: string
  pub_key: string
  address: string
  halted: boolean
  gas_rate: string
  gas_rate_units: string
  router?: string
  global_trading_paused: boolean
  chain_trading_paused: boolean
  chain_lp_actions_paused: boolean
  outbound_tx_size: string
  outbound_fee: string
}

export type ThorchainSwapperDeps = {
  daemonUrl: string
  midgardUrl: string
  adapterManager: ChainAdapterManager
  web3: Web3
}

export interface BtcThorTrade<C extends ChainId> extends Trade<C> {
  chainId: UtxoSupportedChainIds
  txData: BTCSignTx
}

export interface EthThorTrade<C extends ChainId> extends Trade<C> {
  chainId: KnownChainIds.EthereumMainnet
  txData: ETHSignTx
}

export interface CosmosThorTrade<C extends ChainId> extends Trade<C> {
  chainId: KnownChainIds.CosmosMainnet
  txData: CosmosSignTx
}

export type ThorTrade<C extends ChainId> = BtcThorTrade<C> | EthThorTrade<C> | CosmosThorTrade<C>
