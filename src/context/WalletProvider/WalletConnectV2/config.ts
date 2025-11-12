import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import type { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import type { Chain } from 'viem/chains'
import {
  arbitrum,
  arbitrumNova,
  avalanche,
  base,
  bsc,
  gnosis,
  mainnet,
  optimism,
  polygon,
} from 'viem/chains'

import type { EthereumProviderOptions } from './constants'

import { WalletConnectIcon } from '@/components/Icons/WalletConnectIcon'
import { getConfig } from '@/config'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type WalletConnectV2ConfigType = Omit<SupportedWalletInfo<typeof WalletConnectV2Adapter>, 'routes'>

export const WalletConnectV2Config: WalletConnectV2ConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-walletconnectv2').then(m => m.WalletConnectV2Adapter),
    },
  ],
  icon: WalletConnectIcon,
  name: 'WalletConnect',
  description: 'v2',
  supportsMobile: 'browser',
}
type ViemChain = Chain
type AtLeastOneViemChain = [ViemChain, ...ViemChain[]]
type AtLeastOneNumber = [number, ...number[]]

export const walletConnectV2RequiredChains: AtLeastOneViemChain = (() => {
  const viemChains: Chain[] = [mainnet]
  if (viemChains.length === 0) throw new Error('Array must contain at least one element.')
  return viemChains as AtLeastOneViemChain
})()

const walletConnectV2RequiredChainIds: AtLeastOneNumber = (() => {
  const chainIds = walletConnectV2RequiredChains.map(chain => chain.id)
  if (chainIds.length === 0) throw new Error('Array must contain at least one element.')
  return chainIds as AtLeastOneNumber
})()

export const walletConnectV2OptionalChains: AtLeastOneViemChain = (() => {
  const optionalViemChains: ViemChain[] = [
    optimism,
    bsc,
    gnosis,
    polygon,
    avalanche,
    arbitrum,
    arbitrumNova,
    base,
  ]
  if (optionalViemChains.length === 0) throw new Error('Array must contain at least one element.')
  return optionalViemChains as AtLeastOneViemChain
})()

const walletConnectV2OptionalChainIds: AtLeastOneNumber = (() => {
  const chainIds = walletConnectV2OptionalChains.map(chain => chain.id)
  if (chainIds.length === 0) throw new Error('Array must contain at least one element.')
  return chainIds as AtLeastOneNumber
})()

const {
  VITE_WALLET_CONNECT_WALLET_PROJECT_ID,
  VITE_AVALANCHE_NODE_URL,
  VITE_OPTIMISM_NODE_URL,
  VITE_BNBSMARTCHAIN_NODE_URL,
  VITE_POLYGON_NODE_URL,
  VITE_GNOSIS_NODE_URL,
  VITE_ETHEREUM_NODE_URL,
  VITE_ARBITRUM_NODE_URL,
  VITE_ARBITRUM_NOVA_NODE_URL,
  VITE_BASE_NODE_URL,
} = getConfig()

export const walletConnectV2ProviderConfig: EthereumProviderOptions = {
  projectId: VITE_WALLET_CONNECT_WALLET_PROJECT_ID,
  chains: walletConnectV2RequiredChainIds,
  optionalChains: walletConnectV2OptionalChainIds,
  optionalMethods: [
    'eth_signTypedData',
    'eth_signTypedData_v4',
    'eth_sign',
    'ethVerifyMessage',
    'eth_accounts',
    'eth_sendTransaction',
    'eth_signTransaction',
  ],
  showQrModal: true,
  qrModalOptions: {
    themeVariables: {
      '--wcm-z-index': '2000',
    },
  },
  rpcMap: {
    [CHAIN_REFERENCE.AvalancheCChain]: VITE_AVALANCHE_NODE_URL,
    [CHAIN_REFERENCE.OptimismMainnet]: VITE_OPTIMISM_NODE_URL,
    [CHAIN_REFERENCE.BnbSmartChainMainnet]: VITE_BNBSMARTCHAIN_NODE_URL,
    [CHAIN_REFERENCE.PolygonMainnet]: VITE_POLYGON_NODE_URL,
    [CHAIN_REFERENCE.GnosisMainnet]: VITE_GNOSIS_NODE_URL,
    [CHAIN_REFERENCE.EthereumMainnet]: VITE_ETHEREUM_NODE_URL,
    [CHAIN_REFERENCE.ArbitrumMainnet]: VITE_ARBITRUM_NODE_URL,
    [CHAIN_REFERENCE.ArbitrumNovaMainnet]: VITE_ARBITRUM_NOVA_NODE_URL,
    [CHAIN_REFERENCE.BaseMainnet]: VITE_BASE_NODE_URL,
  },
}

export const walletConnectV2DirectProviderConfig: EthereumProviderOptions = {
  ...walletConnectV2ProviderConfig,
  showQrModal: false,
  qrModalOptions: undefined,
}
