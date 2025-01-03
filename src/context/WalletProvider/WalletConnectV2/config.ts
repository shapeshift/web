import { CHAIN_REFERENCE } from '@shapeshiftoss/caip'
import type { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import { getConfig } from 'config'
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
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

import type { EthereumProviderOptions } from './constants'

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
  REACT_APP_WALLET_CONNECT_WALLET_PROJECT_ID,
  REACT_APP_AVALANCHE_NODE_URL,
  REACT_APP_OPTIMISM_NODE_URL,
  REACT_APP_BNBSMARTCHAIN_NODE_URL,
  REACT_APP_POLYGON_NODE_URL,
  REACT_APP_GNOSIS_NODE_URL,
  REACT_APP_ETHEREUM_NODE_URL,
  REACT_APP_ARBITRUM_NODE_URL,
  REACT_APP_ARBITRUM_NOVA_NODE_URL,
  REACT_APP_BASE_NODE_URL,
} = getConfig()

export const walletConnectV2ProviderConfig: EthereumProviderOptions = {
  projectId: REACT_APP_WALLET_CONNECT_WALLET_PROJECT_ID,
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
    [CHAIN_REFERENCE.AvalancheCChain]: REACT_APP_AVALANCHE_NODE_URL,
    [CHAIN_REFERENCE.OptimismMainnet]: REACT_APP_OPTIMISM_NODE_URL,
    [CHAIN_REFERENCE.BnbSmartChainMainnet]: REACT_APP_BNBSMARTCHAIN_NODE_URL,
    [CHAIN_REFERENCE.PolygonMainnet]: REACT_APP_POLYGON_NODE_URL,
    [CHAIN_REFERENCE.GnosisMainnet]: REACT_APP_GNOSIS_NODE_URL,
    [CHAIN_REFERENCE.EthereumMainnet]: REACT_APP_ETHEREUM_NODE_URL,
    [CHAIN_REFERENCE.ArbitrumMainnet]: REACT_APP_ARBITRUM_NODE_URL,
    [CHAIN_REFERENCE.ArbitrumNovaMainnet]: REACT_APP_ARBITRUM_NOVA_NODE_URL,
    [CHAIN_REFERENCE.BaseMainnet]: REACT_APP_BASE_NODE_URL,
  },
}
