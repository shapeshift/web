import { ChainTypes } from '@shapeshiftoss/types'
import Web3 from 'web3'

type TrustWalletServiceProps = {
  chain: ChainTypes
  tokenId: string
}
export const generateTrustWalletUrl = ({ chain, tokenId }: TrustWalletServiceProps) => {
  let url = `https://rawcdn.githack.com/trustwallet/assets/master/blockchains/${chain}`
  if (tokenId) {
    url += `/assets/`
    switch (chain) {
      case ChainTypes.Ethereum:
        url += Web3.utils.toChecksumAddress(tokenId)
        break
    }
  }
  return {
    info: `${url}/info.json`,
    icon: `${url}/logo.png`
  }
}
