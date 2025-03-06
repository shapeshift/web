import type { Csp } from '../types'

export const csp: Csp = {
  'connect-src': [
    // Alchemy SDK NFT resolution on Polygon mainnet
    'https://polygon-mainnet.g.alchemy.com/nft/v3/',
    // Alchemy SDK NFT resolution on Ethereum mainnet
    'https://eth-mainnet.g.alchemy.com/nft/v3/',
    // Alchemy SDK NFT resolution on Optimism mainnet
    'https://opt-mainnet.g.alchemy.com/nft/v3/',
    // Alchemy SDK NFT resolution on Arbitrum mainnet
    'https://arb-mainnet.g.alchemy.com/nft/v3/',
    // Alchemy SDK NFT resolution on Base mainnet
    'https://base-mainnet.g.alchemy.com/nft/v3/',
    // Mercle IPNS gateway for NFT resolution
    'https://backend.mercle.xyz/ipns/',
    // Custom token metadata resolution
    'https://*.g.alchemy.com/v2/',
  ],
}
