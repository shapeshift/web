import { fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isToken } from '@shapeshiftoss/utils'
import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

import type { TxBuildData } from '../../../types'
import { getRelayPsbtRelayer } from './getRelayPsbtRelayer'
import type { RelayQuoteItem, RelaySolanaInstruction, RelayTransactionMetadata } from './types'
import {
  isRelayQuoteEvmItemData,
  isRelayQuoteSolanaItemData,
  isRelayQuoteTronItemData,
  isRelayQuoteUtxoItemData,
} from './types'

const convertSolanaInstruction = (instruction: RelaySolanaInstruction): TransactionInstruction => ({
  ...instruction,
  keys: instruction.keys.map(account => ({
    ...account,
    pubkey: new PublicKey(account.pubkey),
  })),
  data: Buffer.from(instruction.data, 'hex'),
  programId: new PublicKey(instruction.programId),
})

type RelayStepTransactionData = {
  transactionData: TxBuildData | undefined
  relayTransactionMetadata?: RelayTransactionMetadata
}

export const getRelayStepTransactionData = ({
  data,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  orderId,
}: {
  data: RelayQuoteItem['data']
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  orderId: string | undefined
}): RelayStepTransactionData => {
  if (!data) throw new Error('Relay quote step contains no data')

  if (isRelayQuoteUtxoItemData(data)) {
    if (!data.psbt) throw new Error('Relay BTC quote step contains no psbt')

    const relayer = getRelayPsbtRelayer(data.psbt, sellAmountIncludingProtocolFeesCryptoBaseUnit)

    if (!relayer) throw new Error('Relay BTC quote step contains no relayer')
    if (!orderId) throw new Error('Relay BTC quote step contains no orderId')

    return {
      transactionData: {
        type: 'utxo',
        to: relayer,
        opReturnData: orderId,
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      },
    }
  }

  if (isRelayQuoteEvmItemData(data)) {
    const { data: callData, gas: gasLimit, to, value: _value } = data

    if (!to) throw new Error('Missing Relay EVM transaction target address')

    const isTokenSell = isToken(sellAsset.assetId)
    if (isTokenSell && !callData) throw new Error('Missing Relay EVM transaction data')

    const value = isTokenSell ? '0' : _value
    if (typeof value !== 'string') throw new Error('Missing Relay EVM transaction value')

    return {
      transactionData: {
        type: 'evm',
        chainId: Number(fromChainId(sellAsset.chainId).chainReference),
        to,
        value,
        data: callData ?? '0x',
        gasLimit,
      },
    }
  }

  if (isRelayQuoteSolanaItemData(data)) {
    return {
      transactionData: {
        type: 'solana',
        instructions: data.instructions?.map(convertSolanaInstruction) ?? [],
        addressLookupTableAddresses: data.addressLookupTableAddresses ?? [],
      },
    }
  }

  if (isRelayQuoteTronItemData(data)) {
    const contractAddress = data.parameter?.contract_address
    const callData = data.parameter?.data
    const isTronToken = isToken(sellAsset.assetId)

    if (isTronToken && !contractAddress) throw new Error('Missing Relay Tron contract address')
    if (isTronToken && !callData) throw new Error('Missing Relay Tron transaction data')

    return {
      transactionData: undefined,
      relayTransactionMetadata: { to: contractAddress, data: callData },
    }
  }

  throw new Error('Relay quote step contains no data')
}
