import { ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ApproveInfiniteInput, SwapError, SwapErrorType } from '../../../api'
import { erc20Abi } from '../../utils/abi/erc20-abi'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
import { grantAllowance } from '../../utils/helpers/helpers'
import { ThorchainSwapperDeps } from '../types'
import { MAX_ALLOWANCE } from '../utils/constants'

export const thorTradeApproveInfinite = async ({
  deps,
  input,
}: {
  deps: ThorchainSwapperDeps
  input: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>
}): Promise<string> => {
  try {
    const { adapterManager, web3 } = deps
    const { quote, wallet } = input

    const approvalQuote = {
      ...quote,
      sellAmount: MAX_ALLOWANCE,
      feeData: {
        ...quote.feeData,
        chainSpecific: {
          ...quote.feeData.chainSpecific,
          // Thor approvals are cheaper than trades, but we don't have dynamic quote data for them.
          // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the Thor quote response.
          estimatedGas: APPROVAL_GAS_LIMIT,
        },
      },
    }

    const sellAssetChainId = approvalQuote.sellAsset.chainId
    const adapter = adapterManager.get(KnownChainIds.EthereumMainnet) as unknown as
      | ethereum.ChainAdapter
      | undefined

    if (!adapter)
      throw new SwapError(
        `[thorTradeApproveInfinite] - No chain adapter found for ${sellAssetChainId}.`,
        {
          code: SwapErrorType.UNSUPPORTED_CHAIN,
          details: { sellAssetChainId },
        },
      )

    const allowanceGrantRequired = await grantAllowance<KnownChainIds.EthereumMainnet>({
      quote: approvalQuote,
      wallet,
      adapter,
      erc20Abi,
      web3,
    })

    return allowanceGrantRequired
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxApproveInfinite]', {
      cause: e,
      code: SwapErrorType.APPROVE_INFINITE_FAILED,
    })
  }
}
