import { fromAssetId } from '@shapeshiftoss/caip'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { supportsTron } from '@shapeshiftoss/hdwallet-core'
import { TronWeb } from 'tronweb'

import { assertGetTronChainAdapter } from '..'
import type { ApproveTronInputWithWallet } from './types'

export const approveTron = async ({
  assetId,
  spender,
  amountCryptoBaseUnit,
  wallet,
  accountNumber,
  from,
}: ApproveTronInputWithWallet): Promise<string> => {
  const { assetReference: tokenAddress, chainId } = fromAssetId(assetId)

  const adapter = assertGetTronChainAdapter(chainId)
  const rpcUrl = adapter.httpProvider.getRpcUrl()

  const tronWeb = new TronWeb({ fullHost: rpcUrl })

  // Build approve transaction
  const parameters = [
    { type: 'address', value: spender },
    { type: 'uint256', value: amountCryptoBaseUnit },
  ]

  const options = {
    feeLimit: 100_000_000, // 100 TRX fee limit
    callValue: 0,
  }

  const txData = await tronWeb.transactionBuilder.triggerSmartContract(
    tokenAddress,
    'approve(address,uint256)',
    options,
    parameters,
    from,
  )

  if (!txData.result?.result) {
    throw new Error('Failed to build TRON approval transaction')
  }

  // Extract raw_data_hex
  const transaction = txData.transaction
  const rawDataHex =
    typeof transaction.raw_data_hex === 'string'
      ? transaction.raw_data_hex
      : Buffer.isBuffer(transaction.raw_data_hex)
      ? (transaction.raw_data_hex as Buffer).toString('hex')
      : Array.isArray(transaction.raw_data_hex)
      ? Buffer.from(transaction.raw_data_hex as number[]).toString('hex')
      : (() => {
          throw new Error(`Unexpected raw_data_hex type: ${typeof transaction.raw_data_hex}`)
        })()

  if (!/^[0-9a-fA-F]+$/.test(rawDataHex)) {
    throw new Error(`Invalid raw_data_hex format: ${rawDataHex.slice(0, 100)}`)
  }

  // Build HDWallet-compatible transaction
  const bip44Params = adapter.getBip44Params({ accountNumber })
  const addressNList = toAddressNList(bip44Params)

  const tronTx = {
    addressNList,
    rawDataHex,
    transaction,
  }

  // Sign with wallet
  if (!supportsTron(wallet)) {
    throw new Error('Wallet does not support TRON')
  }

  const signedTx = await wallet.tronSignTx(tronTx)

  if (!signedTx?.serialized) {
    throw new Error('Failed to sign TRON approval transaction')
  }

  // Build the transaction object for broadcast
  // signedTx.serialized is the raw hex, signature is separate
  const broadcastTx = {
    ...transaction,
    signature: [signedTx.signature],
  }

  const broadcastResponse = await fetch(`${rpcUrl}/wallet/broadcasttransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(broadcastTx),
  })

  if (!broadcastResponse.ok) {
    throw new Error(`Failed to broadcast TRON approval: ${broadcastResponse.statusText}`)
  }

  const result = await broadcastResponse.json()

  if (!result.result && !result.txid) {
    throw new Error(`TRON approval broadcast failed: ${JSON.stringify(result)}`)
  }

  return result.txid
}
