import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import { numberToHex } from 'web3-utils'

import { bnOrZero } from './bignumber'

type BuildTxToSignInput = {
  bip44Params: BIP44Params
  chainId: number
  data: string
  estimatedFees: FeeDataEstimate<KnownChainIds.EthereumMainnet>
  nonce: string
  value: string
  to: string
}

export const buildTxToSign = ({
  bip44Params,
  chainId = 1,
  data,
  estimatedFees,
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
  gasPrice: numberToHex(bnOrZero(estimatedFees.fast.chainSpecific.gasPrice).toString()),
  gasLimit: numberToHex(bnOrZero(estimatedFees.fast.chainSpecific.gasLimit).toString()),
})
