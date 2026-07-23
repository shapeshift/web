import { fromChainId, monadChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero, contractAddressOrUndefined, isToken } from '@shapeshiftoss/utils'
import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'
import type { Hex } from 'viem'
import { getAddress } from 'viem'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import {
  getSolanaNetworkFeeCryptoBaseUnit,
  omitComputeBudgetInstructions,
} from '../../../solana-utils'
import type { SwapperDeps, TxBuildData } from '../../../types'
import { simulateWithStateOverrides } from '../../../utils/tenderly'
import { getUtxoNetworkFeeCryptoBaseUnit } from '../../../utxo-utils'
import { getRelayPsbtRelayer } from './getRelayPsbtRelayer'
import type { RelayQuoteItem, RelaySolanaInstruction, RelayTransactionMetadata } from './types'
import {
  isRelayQuoteEvmItemData,
  isRelayQuoteSolanaItemData,
  isRelayQuoteTronItemData,
  isRelayQuoteUtxoItemData,
} from './types'

type RelayStepData = {
  transactionData: TxBuildData | undefined
  relayTransactionMetadata?: RelayTransactionMetadata
  networkFeeCryptoBaseUnit: string
}

const convertSolanaInstruction = (instruction: RelaySolanaInstruction): TransactionInstruction => ({
  ...instruction,
  keys: instruction.keys.map(account => ({
    ...account,
    pubkey: new PublicKey(account.pubkey),
  })),
  data: Buffer.from(instruction.data, 'hex'),
  programId: new PublicKey(instruction.programId),
})

const simulateEvmGasLimit = async ({
  transactionData,
  sellAsset,
  from,
  config,
}: {
  transactionData: Extract<TxBuildData, { type: 'evm' }>
  sellAsset: Asset
  from: string
  config: SwapperDeps['config']
}): Promise<string | undefined> => {
  try {
    const simulation = await simulateWithStateOverrides(
      {
        chainId: sellAsset.chainId,
        from: getAddress(from),
        to: getAddress(transactionData.to),
        data: transactionData.data as Hex,
        value: transactionData.value,
        sellAsset,
        // Pass Relay's gas limit to Tenderly for Monad as tenderly return crazy gas
        gas:
          transactionData.gasLimit && sellAsset.chainId === monadChainId
            ? Number(transactionData.gasLimit)
            : undefined,
      },
      {
        apiKey: config.VITE_TENDERLY_API_KEY,
        accountSlug: config.VITE_TENDERLY_ACCOUNT_SLUG,
        projectSlug: config.VITE_TENDERLY_PROJECT_SLUG,
      },
    )

    return simulation.success ? simulation.gasLimit.toString() : undefined
  } catch {}
}

type BaseArgs = {
  data: RelayQuoteItem['data']
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  orderId: string | undefined
  from: string
  supportsEIP1559: boolean
  xpub: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string
  deps: SwapperDeps
}

type RateArgs = BaseArgs & { type: 'rate' }
type QuoteArgs = BaseArgs & { type: 'quote' }

type GetRelayStepDataArgs = RateArgs | QuoteArgs

export const getRelayStepData = async ({
  data,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  orderId,
  from,
  supportsEIP1559,
  xpub,
  type,
  fallbackNetworkFeeCryptoBaseUnit,
  deps,
}: GetRelayStepDataArgs): Promise<RelayStepData> => {
  if (!data) throw new Error('Relay quote step contains no data')

  if (isRelayQuoteEvmItemData(data)) {
    const { data: callData, gas: relayGasLimit, to, value: _value } = data

    if (!to) throw new Error('Missing Relay EVM transaction target address')

    if (!callData) throw new Error('Missing Relay EVM transaction data')

    const value = isToken(sellAsset.assetId) ? '0' : _value
    if (typeof value !== 'string') throw new Error('Missing Relay EVM transaction value')

    const transactionData: TxBuildData = {
      type: 'evm',
      chainId: Number(fromChainId(sellAsset.chainId).chainReference),
      to,
      value,
      data: callData,
      gasLimit: bnOrZero(relayGasLimit).gt(0) ? relayGasLimit : undefined,
    }

    const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)

    const networkFeeCryptoBaseUnit = await (async () => {
      if (type === 'rate') {
        try {
          const simulatedGasLimit = await simulateEvmGasLimit({
            transactionData,
            sellAsset,
            from,
            config: deps.config,
          })

          if (!simulatedGasLimit) return fallbackNetworkFeeCryptoBaseUnit

          return await getEvmNetworkFeeCryptoBaseUnit({
            adapter,
            supportsEIP1559,
            gasLimit: simulatedGasLimit,
          })
        } catch {
          return fallbackNetworkFeeCryptoBaseUnit
        }
      }

      try {
        return await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from,
          supportsEIP1559,
        })
      } catch (error) {
        // A quote missing a gas limit will throw at execution, so fail it here instead
        if (!transactionData.gasLimit) throw error
        return fallbackNetworkFeeCryptoBaseUnit
      }
    })()

    return { transactionData, networkFeeCryptoBaseUnit }
  }

  if (isRelayQuoteUtxoItemData(data)) {
    if (!data.psbt) throw new Error('Relay BTC quote step contains no psbt')

    const relayer = getRelayPsbtRelayer(data.psbt, sellAmountIncludingProtocolFeesCryptoBaseUnit)

    if (!relayer) throw new Error('Relay BTC quote step contains no relayer')
    if (!orderId) throw new Error('Relay BTC quote step contains no orderId')

    const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
      adapter: deps.assertGetUtxoChainAdapter(sellAsset.chainId),
      pubkey: xpub,
      to: relayer,
      value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      opReturnData: orderId,
    })

    return {
      transactionData: {
        type: 'utxo',
        to: relayer,
        opReturnData: orderId,
        value: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      },
      networkFeeCryptoBaseUnit,
    }
  }

  if (isRelayQuoteSolanaItemData(data)) {
    const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

    const instructions = omitComputeBudgetInstructions(
      data.instructions?.map(convertSolanaInstruction) ?? [],
    )
    const addressLookupTableAddresses = data.addressLookupTableAddresses ?? []

    const transactionData: TxBuildData = {
      type: 'solana',
      instructions,
      addressLookupTableAddresses,
    }

    if (type === 'rate') {
      // Rates are best effort - simulation from the unfunded walletless default user fails, and
      // the provider fee (which under-reports below the 5000 lamport signature fee) stands in
      try {
        const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
          adapter,
          from,
          instructions,
          addressLookupTableAddresses,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
        })
        return { transactionData, networkFeeCryptoBaseUnit }
      } catch {
        return { transactionData, networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit }
      }
    }

    const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
      adapter,
      from,
      instructions,
      addressLookupTableAddresses,
      tokenId: contractAddressOrUndefined(sellAsset.assetId),
    })

    return { transactionData, networkFeeCryptoBaseUnit }
  }

  if (isRelayQuoteTronItemData(data)) {
    const contractAddress = data.parameter?.contract_address
    const tronCallData = data.parameter?.data
    const isTronToken = isToken(sellAsset.assetId)

    if (isTronToken && !contractAddress) throw new Error('Missing Relay Tron contract address')
    if (isTronToken && !tronCallData) throw new Error('Missing Relay Tron transaction data')

    return {
      transactionData: undefined,
      relayTransactionMetadata: { to: contractAddress, data: tronCallData },
      networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit,
    }
  }

  throw new Error('Relay quote step contains no data')
}
