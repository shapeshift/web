import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { BTCSignTx, CosmosSignTx, ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type Web3 from 'web3'

import { Trade } from '../../api'

export type PoolResponse = {
  asset: string
  assetDepth: string
  assetPrice: string
  assetPriceUSD: string
  liquidityUnits: string
  poolAPY: string
  runeDepth: string
  status: string
  synthSupply: string
  synthUnits: string
  units: string
  volume24h: string
}

export type InboundResponse = {
  chain: string
  pub_key: string
  address: string
  halted: boolean
  gas_rate: string
  router?: string
}

export type ThorchainSwapperDeps = {
  midgardUrl: string
  adapterManager: ChainAdapterManager
  web3: Web3
}

export interface BtcThorTrade<C extends ChainId> extends Trade<C> {
  chainId: KnownChainIds.BitcoinMainnet
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
