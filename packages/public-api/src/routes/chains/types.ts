import { z } from 'zod'

import { registry } from '../../registry'

export const ChainTypeSchema = z.enum([
  'evm',
  'utxo',
  'cosmos',
  'solana',
  'tron',
  'sui',
  'near',
  'starknet',
  'ton',
])

export const ChainSchema = registry.register(
  'Chain',
  z.object({
    chainId: z.string().openapi({ example: 'eip155:1' }),
    name: z.string().openapi({ example: 'Ethereum' }),
    type: ChainTypeSchema.openapi({ example: 'evm' }),
    symbol: z.string().openapi({ example: 'ETH' }),
    precision: z.number().openapi({ example: 18 }),
    color: z.string().openapi({ example: '#5C6BC0' }),
    networkColor: z.string().optional().openapi({ example: '#5C6BC0' }),
    icon: z.string().optional().openapi({
      example:
        'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
    }),
    networkIcon: z.string().optional().openapi({
      example:
        'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
    }),
    explorer: z.string().openapi({ example: 'https://etherscan.io' }),
    explorerAddressLink: z.string().openapi({ example: 'https://etherscan.io/address/' }),
    explorerTxLink: z.string().openapi({ example: 'https://etherscan.io/tx/' }),
    nativeAssetId: z.string().openapi({ example: 'eip155:1/slip44:60' }),
  }),
)

export const ChainsListResponseSchema = z.object({
  chains: z.array(ChainSchema),
  timestamp: z.number(),
})

export const ChainCountResponseSchema = z.object({
  count: z.number().openapi({ example: 28 }),
  timestamp: z.number(),
})

export type ChainType = z.infer<typeof ChainTypeSchema>
export type Chain = z.infer<typeof ChainSchema>
export type ChainsListResponse = z.infer<typeof ChainsListResponseSchema>
export type ChainCountResponse = z.infer<typeof ChainCountResponseSchema>
