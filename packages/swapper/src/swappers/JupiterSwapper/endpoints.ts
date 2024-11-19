import { CHAIN_NAMESPACE, fromAssetId, solAssetId } from '@shapeshiftoss/caip'
import type { BuildSendApiTxInput, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx, SolanaTxInstruction } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { PublicKey, type TransactionInstruction } from '@solana/web3.js'
import type { AxiosError } from 'axios'

import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { type SwapperApi } from '../../types'
import { checkSolanaSwapStatus, isExecutableTradeQuote, isExecutableTradeStep } from '../../utils'
import { getTradeQuote, getTradeRate } from './swapperApi/getTradeQuote'
import { getJupiterSwapInstructions } from './utils/helpers'

export const jupiterApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  getUnsignedSolanaTransaction: async ({
    tradeQuote,
    from,
    assertGetSolanaChainAdapter,
    config,
  }: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const jupiterUrl = config.REACT_APP_JUPITER_API_URL

    const step = tradeQuote.steps[0]

    if (!isExecutableTradeStep(step)) throw Error('Unable to execute step')

    if (!tradeQuote.rawQuote) throw Error('Missing raw quote')

    const contractAddress =
      step.sellAsset.assetId === solAssetId
        ? undefined
        : fromAssetId(step.sellAsset.assetId).assetReference

    const adapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)

    const { instruction: createTokenAccountInstruction, destinationTokenAccount } =
      await (async () => {
        if (contractAddress) {
          return await adapter.createAssociatedTokenAccountInstruction({
            from,
            to: tradeQuote.receiveAddress,
            tokenId: contractAddress,
          })
        }

        return {
          instruction: undefined,
          destinationTokenAccount: undefined,
        }
      })()

    const maybeSwapResponse = await getJupiterSwapInstructions({
      apiUrl: jupiterUrl,
      fromAddress: from,
      toAddress: destinationTokenAccount?.toString() ?? tradeQuote.receiveAddress,
      rawQuote: tradeQuote.rawQuote,
    })

    if (maybeSwapResponse.isErr()) {
      const error = maybeSwapResponse.unwrapErr()
      const cause = error.cause as AxiosError<any, any>
      throw Error(cause.response!.data.detail)
    }

    const { data: swapResponse } = maybeSwapResponse.unwrap()

    const setupInstructions = swapResponse.setupInstructions.map(instruction => {
      return {
        ...instruction,
        keys: swapResponse.swapInstruction.accounts.map(account => {
          return {
            ...account,
            pubkey: new PublicKey(account.pubkey),
          }
        }),
        data: Buffer.from(instruction.data, 'base64'),
        programId: new PublicKey(swapResponse.swapInstruction.programId),
      }
    })

    const swapInstruction = {
      ...swapResponse.swapInstruction,
      keys: swapResponse.swapInstruction.accounts.map(account => {
        return {
          ...account,
          pubkey: new PublicKey(account.pubkey),
        }
      }),
      data: Buffer.from(swapResponse.swapInstruction.data, 'base64'),
      programId: new PublicKey(swapResponse.swapInstruction.programId),
    }

    const instructions = [
      ...setupInstructions,
      swapInstruction,
    ] as unknown as TransactionInstruction[]

    if (createTokenAccountInstruction) {
      instructions.unshift(createTokenAccountInstruction)
    }

    const getFeeData = async () => {
      const { chainNamespace } = fromAssetId(step.sellAsset.assetId)

      switch (chainNamespace) {
        case CHAIN_NAMESPACE.Solana: {
          const sellAdapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)
          const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
            // Simulates a self-send
            to: from,
            value: '0',
            chainSpecific: {
              from,
              addressLookupTableAccounts: swapResponse.addressLookupTableAddresses,
              instructions,
            },
          }
          const { fast } = await sellAdapter.getFeeData(getFeeDataInput)
          return fast
        }

        default:
          throw new Error('Unsupported chainNamespace')
      }
    }

    const {
      chainSpecific: { computeUnitsInstruction, computeUnitsPriceInstruction },
    } = await getFeeData()

    const solanaInstructions: SolanaTxInstruction[] = [
      ...setupInstructions.map(instruction => adapter.convertInstruction(instruction)),
      adapter.convertInstruction(swapInstruction),
    ]

    solanaInstructions.unshift(computeUnitsInstruction)
    solanaInstructions.unshift(computeUnitsPriceInstruction)

    if (createTokenAccountInstruction) {
      solanaInstructions.unshift(adapter.convertInstruction(createTokenAccountInstruction))
    }

    const buildSwapTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
      to: '',
      from,
      value: '0',
      accountNumber: step.accountNumber,
      chainSpecific: {
        addressLookupTableAccounts: swapResponse.addressLookupTableAddresses,
        instructions: solanaInstructions,
      },
    }

    return (await adapter.buildSendApiTransaction(buildSwapTxInput)).txToSign
  },

  checkTradeStatus: checkSolanaSwapStatus,
}
