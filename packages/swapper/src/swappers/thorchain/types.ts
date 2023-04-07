import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapterManager, SignTx } from '@shapeshiftoss/chain-adapters'
import type Web3 from 'web3'

import type { Trade } from '../../api'
import {
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainId,
  ThorUtxoSupportedChainId,
} from './ThorchainSwapper'

export type ThornodePoolResponse = {
  LP_units: string
  asset: string
  balance_asset: string
  balance_rune: string
  pending_inbound_asset: string
  pending_inbound_rune: string
  pool_units: string
  savers_depth: string
  savers_units: string
  status: string
  synth_mint_paused: boolean
  synth_supply: string
  synth_supply_remaining: string
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

export interface UtxoThorTrade<C extends ChainId> extends Trade<C> {
  chainId: ThorUtxoSupportedChainId
  txData: SignTx<ThorUtxoSupportedChainId>
}

export interface EvmThorTrade<C extends ChainId> extends Trade<C> {
  chainId: ThorEvmSupportedChainId
  txData: SignTx<ThorEvmSupportedChainId>
}

export interface CosmosSdkThorTrade<C extends ChainId> extends Trade<C> {
  chainId: ThorCosmosSdkSupportedChainId
  txData: SignTx<ThorCosmosSdkSupportedChainId>
}

export type ThorTrade<C extends ChainId> =
  | UtxoThorTrade<C>
  | EvmThorTrade<C>
  | CosmosSdkThorTrade<C>
