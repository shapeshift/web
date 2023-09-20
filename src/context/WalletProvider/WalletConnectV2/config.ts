import { WalletConnectV2Adapter } from '@shapeshiftoss/hdwallet-walletconnectv2'
import type { EthereumProviderOptions } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider'
import { getConfig } from 'config'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const WalletConnectV2Config: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [WalletConnectV2Adapter],
  supportsMobile: 'both',
  icon: WalletConnectIcon,
  name: 'WalletConnectV2',
  description: 'v2',
}

export const walletConnectV2ProviderConfig: EthereumProviderOptions = {
  projectId: getConfig().REACT_APP_WALLET_CONNECT_PROJECT_ID,
  chains: [1],
  optionalChains: [],
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
}
