// Wallets relating to the ShapeShift DAO Treasury
// https://forum.shapeshift.com/thread/dao-treasuries-and-multisigs-43646

import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

export const treasuryChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.SolanaMainnet,
  KnownChainIds.BitcoinMainnet,
] as const

export type TreasuryChainId = (typeof treasuryChainIds)[number]

export const isTreasuryChainId = (chainId: ChainId): chainId is TreasuryChainId => {
  return treasuryChainIds.includes(chainId as TreasuryChainId)
}

// Safes
export const DAO_TREASURY_ETHEREUM_MAINNET = '0x90a48d5cf7343b08da12e067680b4c6dbfe551be'
export const DAO_TREASURY_OPTIMISM = '0x6268d07327f4fb7380732dc6d63d95F88c0E083b'
export const DAO_TREASURY_AVALANCHE = '0x74d63F31C2335b5b3BA7ad2812357672b2624cEd'
export const DAO_TREASURY_POLYGON = '0xB5F944600785724e31Edb90F9DFa16dBF01Af000'
export const DAO_TREASURY_GNOSIS = '0xb0E3175341794D1dc8E5F02a02F9D26989EbedB3'
export const DAO_TREASURY_BSC = '0x8b92b1698b57bEDF2142297e9397875ADBb2297E'
export const DAO_TREASURY_ARBITRUM = '0x38276553F8fbf2A027D901F8be45f00373d8Dd48'
export const DAO_TREASURY_BASE = '0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502'

// Multisigs
export const DAO_TREASURY_COSMOS = 'cosmos1qgmqsmytnwm6mhyxwjeur966lv9jacfexgfzxs'
export const DAO_TREASURY_THORCHAIN = 'thor1xmaggkcln5m5fnha2780xrdrulmplvfrz6wj3l'
export const DAO_TREASURY_SOLANA = 'C7RTJbss7R1r7j8NUNYbasUXfbPJR99PMhqznvCiU43N'
export const DAO_TREASURY_BITCOIN = 'bc1qr2whxtd0gvqnctcxlynwejp6fvntv0mtxkv0dlv02vyale8h69ysm6l32n'
