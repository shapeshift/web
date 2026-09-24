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

  // an estimate failure keeps the standard limit rather than blocking the approval
  const txFee = await adapter
    .getFeeData({ to, value: '0', chainSpecific: { from, data } })
    .then(({ fast }) => fast.txFee)
    .catch((error: unknown) => {
      console.warn('[approveTron] fee estimate failed, keeping the standard fee limit', error)
      return undefined
    })

  const txToSign = await adapter.buildCustomApiTx({
    from,
    to,
    accountNumber,
    data,
    value: '0',
    feeLimit: tron.getTronFeeLimit(txFee),
  })

  return adapter.signAndBroadcastTransaction({
    senderAddress: from,
    receiverAddress: CONTRACT_INTERACTION,
    signTxInput: { txToSign, wallet },
  })
}
