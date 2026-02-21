import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import type { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import type { Chain } from 'viem/chains'
import {
  arbitrum,
  avalanche,
  base,
  bob,
  bsc,
  gnosis,
  hyperEvm,
  ink,
  katana,
  mainnet,
  mode,
  monad,
  optimism,
  plasma,
  polygon,
  unichain,
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

const config = getConfig()

export const walletConnectV2OptionalChains: AtLeastOneViemChain = (() => {
  const optionalViemChains: ViemChain[] = [
    optimism,
    bsc,
    gnosis,
    polygon,
    avalanche,
    arbitrum,
    base,
    ink,
  ]

  if (config.VITE_FEATURE_MONAD) {
    optionalViemChains.push(monad)
  }

  if (config.VITE_FEATURE_HYPEREVM) {
    optionalViemChains.push(hyperEvm)
  }

  if (config.VITE_FEATURE_PLASMA) {
    optionalViemChains.push(plasma)
  }

  if (config.VITE_FEATURE_KATANA) {
    optionalViemChains.push(katana)
  }

  if (config.VITE_FEATURE_UNICHAIN) {
    optionalViemChains.push(unichain)
  }

  if (config.VITE_FEATURE_BOB) {
    optionalViemChains.push(bob)
  }

  if (config.VITE_FEATURE_MODE) {
    optionalViemChains.push(mode)
  }

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
  VITE_BASE_NODE_URL,
  VITE_INK_NODE_URL,
  VITE_MONAD_NODE_URL,
  VITE_HYPEREVM_NODE_URL,
  VITE_PLASMA_NODE_URL,
  VITE_KATANA_NODE_URL,
  VITE_UNICHAIN_NODE_URL,
  VITE_BOB_NODE_URL,
  VITE_MODE_NODE_URL,
} = config

const walletConnectV2RpcMap: Record<number, string> = {
  [CHAIN_REFERENCE.AvalancheCChain]: VITE_AVALANCHE_NODE_URL,
  [CHAIN_REFERENCE.OptimismMainnet]: VITE_OPTIMISM_NODE_URL,
  [CHAIN_REFERENCE.BnbSmartChainMainnet]: VITE_BNBSMARTCHAIN_NODE_URL,
  [CHAIN_REFERENCE.PolygonMainnet]: VITE_POLYGON_NODE_URL,
  [CHAIN_REFERENCE.GnosisMainnet]: VITE_GNOSIS_NODE_URL,
  [CHAIN_REFERENCE.EthereumMainnet]: VITE_ETHEREUM_NODE_URL,
  [CHAIN_REFERENCE.ArbitrumMainnet]: VITE_ARBITRUM_NODE_URL,
  [CHAIN_REFERENCE.BaseMainnet]: VITE_BASE_NODE_URL,
  [CHAIN_REFERENCE.InkMainnet]: VITE_INK_NODE_URL,
}

if (config.VITE_FEATURE_MONAD) {
  walletConnectV2RpcMap[CHAIN_REFERENCE.MonadMainnet] = VITE_MONAD_NODE_URL
}

if (config.VITE_FEATURE_HYPEREVM) {
  walletConnectV2RpcMap[CHAIN_REFERENCE.HyperEvmMainnet] = VITE_HYPEREVM_NODE_URL
}

if (config.VITE_FEATURE_PLASMA) {
  walletConnectV2RpcMap[CHAIN_REFERENCE.PlasmaMainnet] = VITE_PLASMA_NODE_URL
}

if (config.VITE_FEATURE_KATANA) {
  walletConnectV2RpcMap[CHAIN_REFERENCE.KatanaMainnet] = VITE_KATANA_NODE_URL
}

if (config.VITE_FEATURE_UNICHAIN) {
  walletConnectV2RpcMap[CHAIN_REFERENCE.UnichainMainnet] = VITE_UNICHAIN_NODE_URL
}

if (config.VITE_FEATURE_BOB) {
  walletConnectV2RpcMap[CHAIN_REFERENCE.BobMainnet] = VITE_BOB_NODE_URL
}

if (config.VITE_FEATURE_MODE) {
  walletConnectV2RpcMap[CHAIN_REFERENCE.ModeMainnet] = VITE_MODE_NODE_URL
}

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
  rpcMap: walletConnectV2RpcMap,
}

export const walletConnectV2DirectProviderConfig: EthereumProviderOptions = {
  ...walletConnectV2ProviderConfig,
  showQrModal: false,
  qrModalOptions: undefined,
}
