import TrustWalletIcon from '@/assets/trust-wallet.png'
import ZerionWalletIcon from '@/assets/zerion-wallet.png'
import { MetaMaskIcon } from '@/components/Icons/MetaMaskIcon'

// All the types below are copied from @hdwallet/ethereum-provider so we don't have to import the whole package just for the sake of this type
// and can lazy load it instead

type MobileWallet = {
  id: string
  name: string
  links: {
    native: string
    universal?: string
  }
}
type DesktopWallet = {
  id: string
  name: string
  links: {
    native: string
    universal?: string
  }
}

type ConfigCtrlState = {
  projectId: string
  chains?: string[]
  mobileWallets?: MobileWallet[]
  desktopWallets?: DesktopWallet[]
  walletImages?: Record<string, string>
  enableAuthMode?: boolean
  enableExplorer?: boolean
  explorerRecommendedWalletIds?: string[] | 'NONE'
  explorerExcludedWalletIds?: string[] | 'ALL'
  termsOfServiceUrl?: string
  privacyPolicyUrl?: string
}

type ThemeCtrlState = {
  themeVariables?: {
    '--wcm-z-index'?: string
    '--wcm-accent-color'?: string
    '--wcm-accent-fill-color'?: string
    '--wcm-background-color'?: string
    '--wcm-background-border-radius'?: string
    '--wcm-container-border-radius'?: string
    '--wcm-wallet-icon-border-radius'?: string
    '--wcm-wallet-icon-large-border-radius'?: string
    '--wcm-wallet-icon-small-border-radius'?: string
    '--wcm-input-border-radius'?: string
    '--wcm-notification-border-radius'?: string
    '--wcm-button-border-radius'?: string
    '--wcm-secondary-button-border-radius'?: string
    '--wcm-icon-button-border-radius'?: string
    '--wcm-button-hover-highlight-border-radius'?: string
    '--wcm-font-family'?: string
    '--wcm-font-feature-settings'?: string
    '--wcm-text-big-bold-size'?: string
    '--wcm-text-big-bold-weight'?: string
    '--wcm-text-big-bold-line-height'?: string
    '--wcm-text-big-bold-letter-spacing'?: string
    '--wcm-text-big-bold-text-transform'?: string
    '--wcm-text-big-bold-font-family'?: string
    '--wcm-text-medium-regular-size'?: string
    '--wcm-text-medium-regular-weight'?: string
    '--wcm-text-medium-regular-line-height'?: string
    '--wcm-text-medium-regular-letter-spacing'?: string
    '--wcm-text-medium-regular-text-transform'?: string
    '--wcm-text-medium-regular-font-family'?: string
    '--wcm-text-small-regular-size'?: string
    '--wcm-text-small-regular-weight'?: string
    '--wcm-text-small-regular-line-height'?: string
    '--wcm-text-small-regular-letter-spacing'?: string
    '--wcm-text-small-regular-text-transform'?: string
    '--wcm-text-small-regular-font-family'?: string
    '--wcm-text-small-thin-size'?: string
    '--wcm-text-small-thin-weight'?: string
    '--wcm-text-small-thin-line-height'?: string
    '--wcm-text-small-thin-letter-spacing'?: string
    '--wcm-text-small-thin-text-transform'?: string
    '--wcm-text-small-thin-font-family'?: string
    '--wcm-text-xsmall-bold-size'?: string
    '--wcm-text-xsmall-bold-weight'?: string
    '--wcm-text-xsmall-bold-line-height'?: string
    '--wcm-text-xsmall-bold-letter-spacing'?: string
    '--wcm-text-xsmall-bold-text-transform'?: string
    '--wcm-text-xsmall-bold-font-family'?: string
    '--wcm-text-xsmall-regular-size'?: string
    '--wcm-text-xsmall-regular-weight'?: string
    '--wcm-text-xsmall-regular-line-height'?: string
    '--wcm-text-xsmall-regular-letter-spacing'?: string
    '--wcm-text-xsmall-regular-text-transform'?: string
    '--wcm-text-xsmall-regular-font-family'?: string
    '--wcm-overlay-background-color'?: string
    '--wcm-overlay-backdrop-filter'?: string
  }
  themeMode?: 'dark' | 'light'
}
type WalletConnectModalConfig = ConfigCtrlState & ThemeCtrlState
type QrModalOptions = Pick<
  WalletConnectModalConfig,
  | 'themeMode'
  | 'themeVariables'
  | 'desktopWallets'
  | 'enableExplorer'
  | 'explorerRecommendedWalletIds'
  | 'explorerExcludedWalletIds'
  | 'mobileWallets'
  | 'privacyPolicyUrl'
  | 'termsOfServiceUrl'
  | 'walletImages'
>

type ArrayOneOrMore<T> = {
  0: T
} & T[]

type EthereumRpcMap = {
  [chainId: string]: string
}

type KeyValueStorageOptions = {
  database?: string
  table?: string
}

type ChainsProps =
  | {
      chains: ArrayOneOrMore<number>
      optionalChains?: number[]
    }
  | {
      chains?: number[]
      optionalChains: ArrayOneOrMore<number>
    }

type Metadata = {
  name: string
  description: string
  url: string
  icons: string[]
  verifyUrl?: string
  redirect?: {
    native?: string
    universal?: string
    linkMode?: boolean
  }
}

export type EthereumProviderOptions = {
  projectId: string
  methods?: string[]
  optionalMethods?: string[]
  events?: string[]
  optionalEvents?: string[]
  rpcMap?: EthereumRpcMap
  metadata?: Metadata
  showQrModal: boolean
  qrModalOptions?: QrModalOptions
  disableProviderPing?: boolean
  relayUrl?: string
  storageOptions?: KeyValueStorageOptions
} & ChainsProps

export type WalletConnectWalletId = 'metamask' | 'trust' | 'zerion'

type WalletConfigWithIcon = {
  id: WalletConnectWalletId
  name: string
  IconComponent: React.ComponentType<{ boxSize?: string }>
}

type WalletConfigWithImage = {
  id: WalletConnectWalletId
  name: string
  imageUrl: string
}

export type WalletConfig = WalletConfigWithIcon | WalletConfigWithImage

export const WALLET_CONFIGS: WalletConfig[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    IconComponent: MetaMaskIcon,
  },
  {
    id: 'trust',
    name: 'Trust',
    imageUrl: TrustWalletIcon,
  },
  {
    id: 'zerion',
    name: 'Zerion',
    imageUrl: ZerionWalletIcon,
  },
]
