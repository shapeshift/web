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
import type { StepDataArgs, SwapperDeps, TxBuildData } from '../../../types'
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
  transactionData?: TxBuildData
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
  sellAmountCryptoBaseUnit: string
  orderId: string | undefined
  xpub: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string
}

// Walletless rates estimate from the unfunded default user, so from is always present
type GetRelayStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

export const getRelayStepData = async ({
  data,
  sellAsset,
  sellAmountCryptoBaseUnit,
  orderId,
  from,
  xpub,
  type,
  input,
  fallbackNetworkFeeCryptoBaseUnit,
  deps,
}: GetRelayStepDataArgs): Promise<RelayStepData> => {
  if (!data) throw new Error('Relay quote step contains no data')

  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

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

    if (type === 'rate') {
      const networkFeeCryptoBaseUnit = await (async () => {
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
      })()

      return { networkFeeCryptoBaseUnit }
    }

    // Execution needs the same fee data, so estimation failure fails the quote
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from,
      supportsEIP1559,
    })

    return { transactionData, networkFeeCryptoBaseUnit }
  }

  if (isRelayQuoteUtxoItemData(data)) {
    if (!data.psbt) throw new Error('Relay BTC quote step contains no psbt')

    const relayer = getRelayPsbtRelayer(data.psbt, sellAmountCryptoBaseUnit)

    if (!relayer) throw new Error('Relay BTC quote step contains no relayer')
    if (!orderId) throw new Error('Relay BTC quote step contains no orderId')

    const { networkFeeCryptoBaseUnit } = await getUtxoNetworkFeeCryptoBaseUnit({
      adapter: deps.assertGetUtxoChainAdapter(sellAsset.chainId),
      pubkey: xpub,
      to: relayer,
      value: sellAmountCryptoBaseUnit,
      opReturnData: orderId,
    })

    if (type === 'rate') return { networkFeeCryptoBaseUnit }

    return {
      transactionData: {
        type: 'utxo',
        to: relayer,
        opReturnData: orderId,
        value: sellAmountCryptoBaseUnit,
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

    if (type === 'rate') {
      // No placeholder estimation for provider built routes - best effort with provider fee fallback
      try {
        const { networkFeeCryptoBaseUnit } = await getSolanaNetworkFeeCryptoBaseUnit({
          adapter,
          from,
          instructions,
          addressLookupTableAddresses,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
        })
        return { networkFeeCryptoBaseUnit }
      } catch {
        return { networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit }
      }
    }

    const transactionData: TxBuildData = {
      type: 'solana',
      instructions,
      addressLookupTableAddresses,
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

    if (type === 'rate') return { networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit }

    return {
      relayTransactionMetadata: { to: contractAddress, data: tronCallData },
      networkFeeCryptoBaseUnit: fallbackNetworkFeeCryptoBaseUnit,
    }
  }

  throw new Error('Relay quote step contains no data')
}
