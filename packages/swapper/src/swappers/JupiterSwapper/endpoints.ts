import type { BuildSendApiTxInput } from '@shapeshiftoss/chain-adapters'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { AxiosError } from 'axios'
import type { InterpolationOptions } from 'node-polyglot'

import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { type SwapperApi } from '../../types'
import { isExecutableTradeQuote, isExecutableTradeStep } from '../../utils'
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

    // @TODO: add feeAccount
    const maybeSwapResponse = await getJupiterSwapInstructions({
      apiUrl: jupiterUrl,
      fromAddress: from,
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

    const buildSwapTxInput: BuildSendApiTxInput<KnownChainIds.SolanaMainnet> = {
      from,
      value: step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      accountNumber: step.accountNumber,
      chainSpecific: {
        instructions: [...computeBudgetInstructions, ...setupInstructions, swapInstruction],
      },
    } as unknown as BuildSendApiTxInput<KnownChainIds.SolanaMainnet>

    return (await adapter.buildSendApiTransaction(buildSwapTxInput)).txToSign
  },

  checkTradeStatus: (): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    try {
      return {
        buyTxHash: '',
        status: TxStatus.Pending,
        message: '',
      } as unknown as Promise<{
        status: TxStatus
        buyTxHash: string | undefined
        message: string | [string, InterpolationOptions] | undefined
      }>
    } catch (e) {
      console.error(e)
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      } as unknown as Promise<{
        status: TxStatus
        buyTxHash: string | undefined
        message: string | [string, InterpolationOptions] | undefined
      }>
    }
  },
}
