import { bip32ToAddressNList, ETHSignTx } from '@shapeshiftoss/hdwallet-core'
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

function toPath(bip44Params: BIP44Params): string {
  const { purpose, coinType, accountNumber, isChange = false, index = 0 } = bip44Params
  if (typeof purpose === 'undefined') throw new Error('toPath: bip44Params.purpose is required')
  if (typeof coinType === 'undefined') throw new Error('toPath: bip44Params.coinType is required')
  if (typeof accountNumber === 'undefined')
    throw new Error('toPath: bip44Params.accountNumber is required')
  return `m/${purpose}'/${coinType}'/${accountNumber}'/${Number(isChange)}/${index}`
}

export function buildTxToSign({
  bip44Params,
  chainId = 1,
  data,
  estimatedGas,
  gasPrice,
  nonce,
  to,
  value
}: BuildTxToSignInput): ETHSignTx {
  const path = toPath(bip44Params)
  const addressNList = bip32ToAddressNList(path)

  return {
    addressNList,
    value: numberToHex(value),
    to,
    chainId, // TODO: implement for multiple chains
    data,
    nonce: numberToHex(nonce),
    gasPrice: numberToHex(gasPrice),
    gasLimit: numberToHex(estimatedGas)
  }
}
