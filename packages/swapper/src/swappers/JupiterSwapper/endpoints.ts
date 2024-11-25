import { CHAIN_NAMESPACE, fromAssetId, solAssetId, wrappedSolAssetId } from '@shapeshiftoss/caip'
import type { BuildSendApiTxInput, GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { PublicKey, type TransactionInstruction } from '@solana/web3.js'
import type { AxiosError } from 'axios'

import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { type SwapperApi } from '../../types'
import { checkSolanaSwapStatus, isExecutableTradeQuote, isExecutableTradeStep } from '../../utils'
import type { Instruction } from './models/Instruction'
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
      step.buyAsset.assetId === solAssetId
        ? undefined
        : fromAssetId(step.buyAsset.assetId).assetReference

    const adapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)

    const isCrossAccountTrade = tradeQuote.receiveAddress !== from

    if (isCrossAccountTrade && step.buyAsset.assetId === solAssetId) {
      throw Error('Manual receive address is not supported for SOL')
    }

    const { instruction: createTokenAccountInstruction, destinationTokenAccount } =
      contractAddress && isCrossAccountTrade
        ? await adapter.createAssociatedTokenAccountInstruction({
            from,
            to: tradeQuote.receiveAddress,
            tokenId: contractAddress,
          })
        : { instruction: undefined, destinationTokenAccount: undefined }

    const maybeSwapResponse = await getJupiterSwapInstructions({
      apiUrl: jupiterUrl,
      fromAddress: from,
      toAddress: isCrossAccountTrade ? destinationTokenAccount?.toString() : undefined,
      rawQuote: tradeQuote.rawQuote,
      wrapAndUnwrapSol: step.buyAsset.assetId === wrappedSolAssetId ? false : true,
      // Shared account is not supported for simple AMMs
      useSharedAccounts:
        tradeQuote.rawQuote.routePlan.length > 1 && isCrossAccountTrade ? true : false,
    })

    if (maybeSwapResponse.isErr()) {
      const error = maybeSwapResponse.unwrapErr()
      const cause = error.cause as AxiosError<any, any>
      throw Error(cause.response!.data.detail)
    }

    const { data: swapResponse } = maybeSwapResponse.unwrap()

    const convertJupiterInstruction = (instruction: Instruction): TransactionInstruction => ({
      ...instruction,
      keys: instruction.accounts.map(account => ({
        ...account,
        pubkey: new PublicKey(account.pubkey),
      })),
      data: Buffer.from(instruction.data, 'base64'),
      programId: new PublicKey(instruction.programId),
    })

    const instructions: TransactionInstruction[] = [
      ...swapResponse.setupInstructions.map(convertJupiterInstruction),
      convertJupiterInstruction(swapResponse.swapInstruction),
    ]

    if (createTokenAccountInstruction) {
      instructions.unshift(createTokenAccountInstruction)
    }

    if (swapResponse.cleanupInstruction) {
      instructions.push(convertJupiterInstruction(swapResponse.cleanupInstruction))
    }

    const getFeeData = async () => {
      const { chainNamespace } = fromAssetId(step.sellAsset.assetId)

      switch (chainNamespace) {
        case CHAIN_NAMESPACE.Solana: {
          const sellAdapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)
          const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
            to: '',
            value: '0',
            chainSpecific: {
              from,
              addressLookupTableAccounts: swapResponse.addressLookupTableAddresses,
              instructions,
            },
          }
          return await sellAdapter.getFeeData(getFeeDataInput)
        }

        default:
          throw new Error('Unsupported chainNamespace')
      }
    }

    const { fast } = await getFeeData()

    const solanaInstructions = instructions.map(instruction =>
      adapter.convertInstruction(instruction),
    )

    const buildSwapTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
      to: '',
      from,
      value: '0',
      accountNumber: step.accountNumber,
      chainSpecific: {
        addressLookupTableAccounts: swapResponse.addressLookupTableAddresses,
        instructions: solanaInstructions,
        computeUnitLimit: fast.chainSpecific.computeUnits,
        computeUnitPrice: fast.chainSpecific.priorityFee,
      },
    }

    return (await adapter.buildSendApiTransaction(buildSwapTxInput)).txToSign
  },

  checkTradeStatus: checkSolanaSwapStatus,
}
