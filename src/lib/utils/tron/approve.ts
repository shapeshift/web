import { fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION, tron } from '@shapeshiftoss/chain-adapters'
import type { Address } from 'viem'
import { encodeFunctionData, erc20Abi } from 'viem'

import { assertGetTronChainAdapter } from './adapter'
import type { ApproveTronInputWithWallet } from './types'

// The TVM ABI is EVM-compatible; the spender is a base58 address encoded as its 20-byte body
export const getTronApproveContractData = ({
  spender,
  amountCryptoBaseUnit,
}: {
  spender: string
  amountCryptoBaseUnit: string
}): string =>
  encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [tron.toTronHex(spender) as Address, BigInt(amountCryptoBaseUnit)],
  })

export const approveTron = async ({
  assetId,
  spender,
  amountCryptoBaseUnit,
  wallet,
  accountNumber,
  from,
}: ApproveTronInputWithWallet): Promise<string> => {
  const { assetReference: to, chainId } = fromAssetId(assetId)

  const adapter = assertGetTronChainAdapter(chainId)
  const data = getTronApproveContractData({ spender, amountCryptoBaseUnit })

  const txToSign = await adapter.buildCustomApiTx({ from, to, accountNumber, data, value: '0' })

  return adapter.signAndBroadcastTransaction({
    senderAddress: from,
    receiverAddress: CONTRACT_INTERACTION,
    signTxInput: { txToSign, wallet },
  })
}
