import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params } from '@shapeshiftoss/types'
import { numberToHex } from 'web3-utils'

type BuildTxToSignInput = {
  bip44Params: BIP44Params
  chainId: number
  data: string
  estimatedGas: string
  gasPrice: string
  nonce: string
  value: string
  to: string
}

export const buildTxToSign = ({
  bip44Params,
  chainId = 1,
  data,
  estimatedGas,
  gasPrice,
  nonce,
  to,
  value,
}: BuildTxToSignInput): ETHSignTx => ({
  addressNList: toAddressNList(bip44Params),
  value: numberToHex(value),
  to,
  chainId, // TODO: implement for multiple chains
  data,
  nonce: numberToHex(nonce),
  gasPrice: numberToHex(gasPrice),
  gasLimit: numberToHex(estimatedGas),
})
