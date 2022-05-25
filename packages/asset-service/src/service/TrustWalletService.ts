import { CHAIN_NAMESPACE, ChainNamespace } from '@shapeshiftoss/caip'
import Web3 from 'web3'

type TrustWalletServiceProps = {
  chainNamespace: ChainNamespace
  tokenId: string
}
export const generateTrustWalletUrl = ({ chainNamespace, tokenId }: TrustWalletServiceProps) => {
  let url = `https://rawcdn.githack.com/trustwallet/assets/master/blockchains/${chainNamespace}`
  if (tokenId) {
    url += `/assets/`
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Ethereum:
        url += Web3.utils.toChecksumAddress(tokenId)
        break
    }
  }
  return {
    info: `${url}/info.json`,
    icon: `${url}/logo.png`
  }
}
