import { fromAssetId, solAssetId } from '@shapeshiftoss/caip'
import type { BuildSendApiTxInput } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx, SolanaTxInstruction } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
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

    const maybeSwapResponse = await getJupiterSwapInstructions({
      apiUrl: jupiterUrl,
      fromAddress: from,
      toAddress: tradeQuote.receiveAddress,
      rawQuote: tradeQuote.rawQuote,
    })

    if (maybeSwapResponse.isErr()) {
      const error = maybeSwapResponse.unwrapErr()
      const cause = error.cause as AxiosError<any, any>
      throw Error(cause.response!.data.detail)
    }

    const { data: swapResponse } = maybeSwapResponse.unwrap()

    const computeBudgetInstructions = swapResponse.computeBudgetInstructions.map(instruction => {
      return {
        ...instruction,
        keys: instruction.accounts,
        data: Buffer.from(instruction.data, 'base64'),
      }
    })

    const setupInstructions = swapResponse.setupInstructions.map(instruction => {
      return {
        ...instruction,
        keys: instruction.accounts,
        data: Buffer.from(instruction.data, 'base64'),
      }
    })

    const swapInstruction = {
      ...swapResponse.swapInstruction,
      keys: swapResponse.swapInstruction.accounts,
      data: Buffer.from(swapResponse.swapInstruction.data, 'base64'),
    }

    const adapter = assertGetSolanaChainAdapter(step.sellAsset.chainId)

    const contractAddress =
      step.sellAsset.assetId === solAssetId
        ? undefined
        : fromAssetId(step.sellAsset.assetId).assetReference

    const createTokenAccountInstructions = !contractAddress
      ? []
      : await adapter.buildTokenTransferInstructions({
          from,
          to: tradeQuote.receiveAddress,
          tokenId: contractAddress,
          value: '0',
        })

    const buildSwapTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
      to: '',
      from,
      value: '0',
      accountNumber: step.accountNumber,
      chainSpecific: {
        tokenId: contractAddress,
        addressLookupTableAccounts: swapResponse.addressLookupTableAddresses,
        instructions: [
          ...computeBudgetInstructions,
          ...setupInstructions,
          swapInstruction,
          createTokenAccountInstructions[0] as unknown as SolanaTxInstruction,
        ],
      },
    }

    return (await adapter.buildSendApiTransaction(buildSwapTxInput)).txToSign
  },

  checkTradeStatus: checkSolanaSwapStatus,
}
