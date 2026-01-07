import type { Csp } from "../../types";

export const csp: Csp = {
  "connect-src": [
    // Orderly API endpoints
    "https://api.orderly.org/",
    "https://testnet-api.orderly.org/",
    "https://rpc.orderly.network/",
    "wss://ws.orderly.org/",
    "wss://ws-private.orderly.org/",
    "wss://ws-evm.orderly.org/",
    "wss://ws-private-evm.orderly.org/",
    "wss://testnet-ws-evm.orderly.org/",
    "https://api.eu.amplitude.com/",
    // Mainnet RPCs used by Orderly SDK
    "https://arb1.arbitrum.io/",
    "https://mainnet.optimism.io/",
    "https://rpc-mainnet.matic.network/",
    "https://developer-access-mainnet.base.org/",
    "https://bsc-dataseed1.binance.org/",
    "https://api.avax.network/",
    "https://mainnet.infura.io/",
    "https://zksync2-mainnet.zksync.io/",
    "https://zkevm-rpc.com/",
    "https://rpc.linea.build/",
    "https://rpc.mantle.xyz/",
    "https://rpcapi.fantom.network/",
    "https://evm-rpc.sei-apis.com/",
    // Ankr RPC fallbacks (covers multiple chains)
    "https://rpc.ankr.com/",
    // Testnet RPCs used by Orderly SDK
    "https://arbitrum-sepolia.gateway.tenderly.co/",
    "https://arbitrum-sepolia.blockpi.network/",
    "https://goerli-rollup.arbitrum.io/",
    "https://sepolia.optimism.io/",
    "https://optimism-goerli.gateway.tenderly.co/",
    "https://base-sepolia-rpc.publicnode.com/",
    "https://rpc.sepolia.mantle.xyz/",
    "https://rpc-amoy.polygon.technology/",
    "https://api.testnet.abs.xyz/",
    "https://rpc.odyssey.storyrpc.io/",
    // Solana RPCs used by Orderly SDK
    "https://api.devnet.solana.com/",
    "https://api.mainnet-beta.solana.com/",
    // Pocket Network RPCs
    "https://*.api.pocket.network/",
    "https://*.gateway.pokt.network/",
  ],
  "font-src": ["https://fonts.gstatic.com"],
  "style-src": ["https://fonts.googleapis.com"],
  "base-uri": ["'self'"],
};
