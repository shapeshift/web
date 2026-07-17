import { CHAIN_NAMESPACE, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'
import { ComputeBudgetProgram } from '@solana/web3.js'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type {
  CommonTradeQuoteInput,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeQuoteInput,
  SwapperDeps,
  TxBuildData,
} from '../../../types'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'

// Conservative gas limit for rate network fees, where there's no deposit channel to build (or price) a tx yet
const SAFE_GAS_LIMIT = '100000'

// Placeholder vault address for utxo rates without a deposit address — fee simulation requires one or it throws
const UTXO_PLACEHOLDER_ADDRESS = 'bc1pfh5x55a3v92klcrdy5yv6yrt7fzr0g929klkdtapp3njfyu4qsyq8qacyf'

// Builds the executable Chainflip step: a single per-chain branch creates the transactionData (for the chains
// whose exec reads it - evm/solana) and prices the network fee. With a deposit address (quote) it builds the
// executable tx and prices the real gas; without one (rate) it returns an approximate fee and no tx data.
export const getChainflipStepData = async ({
  deps,
  input,
  sellAsset,
  sellAmountCryptoBaseUnit,
  depositAddress,
}: {
  deps: SwapperDeps
  input: GetTradeRateInput | CommonTradeQuoteInput
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  depositAddress: string | undefined
}): Promise<{
  transactionData?: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
  chainSpecific?: { satsPerByte: string }
}> => {
  const { chainNamespace } = fromAssetId(sellAsset.assetId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
      const supportsEIP1559 = (input as GetEvmTradeRateInput).supportsEIP1559

      // Executable quote: build the deposit tx and price the estimated gas limit baked onto it
      if (depositAddress && input.sendAddress) {
        const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
        const data = evm.getErc20Data(depositAddress, sellAmountCryptoBaseUnit, contractAddress)

        const transactionData: TxBuildData = {
          type: 'evm',
          chainId: Number(fromChainId(sellAsset.chainId).chainReference),
          to: contractAddress ?? depositAddress,
          data: data || '0x',
          value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
        }

        const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
          adapter,
          transactionData,
          from: input.sendAddress,
          supportsEIP1559,
        })

        return { transactionData, networkFeeCryptoBaseUnit }
      }

      // Rate: no deposit channel yet, approximate with a safe gas limit
      const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
        adapter,
        supportsEIP1559,
        gasLimit: SAFE_GAS_LIMIT,
      })

      return { networkFeeCryptoBaseUnit }
    }
    case CHAIN_NAMESPACE.Solana: {
      const to = depositAddress ?? input.sendAddress
      if (!to || !input.sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const adapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({
        to,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: input.sendAddress,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      // Only an executable quote (deposit channel known) carries tx data; exec reads it via transactionData
      if (!depositAddress) return { networkFeeCryptoBaseUnit: fast.txFee }

      // Business instructions only; compute budget is dynamic and must be derived at execution time
      const instructions = (
        await adapter.buildEstimationInstructions({
          from: input.sendAddress,
          to: depositAddress,
          tokenId: contractAddressOrUndefined(sellAsset.assetId),
          value: sellAmountCryptoBaseUnit,
        })
      ).filter(
        instruction =>
          instruction.programId.toString() !== ComputeBudgetProgram.programId.toString(),
      )

      return {
        transactionData: { type: 'solana', instructions, addressLookupTableAddresses: [] },
        networkFeeCryptoBaseUnit: fast.txFee,
      }
    }
    case CHAIN_NAMESPACE.Utxo: {
      const pubkey = (input as GetUtxoTradeQuoteInput).xpub
      if (!pubkey) return { networkFeeCryptoBaseUnit: undefined }

      const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)

      const { fast } = await adapter.getFeeData({
        to: depositAddress ?? input.sendAddress ?? UTXO_PLACEHOLDER_ADDRESS,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: { pubkey },
      })

      // Utxo exec builds its tx from chainflipSpecific.depositAddress, so no transactionData is carried
      return {
        networkFeeCryptoBaseUnit: fast.txFee,
        chainSpecific: { satsPerByte: fast.chainSpecific.satoshiPerByte },
      }
    }
    case CHAIN_NAMESPACE.Tron: {
      const to = depositAddress ?? input.sendAddress
      if (!to || !input.sendAddress) return { networkFeeCryptoBaseUnit: undefined }

      const { fast } = await deps.assertGetTronChainAdapter(sellAsset.chainId).getFeeData({
        to,
        value: sellAmountCryptoBaseUnit,
        chainSpecific: {
          from: input.sendAddress,
          contractAddress: contractAddressOrUndefined(sellAsset.assetId),
        },
      })

      // Tron exec builds its tx from chainflipSpecific.depositAddress, so no transactionData is carried
      return { networkFeeCryptoBaseUnit: fast.txFee }
    }
    default:
      throw new Error('Unsupported chainNamespace')
  }
}
