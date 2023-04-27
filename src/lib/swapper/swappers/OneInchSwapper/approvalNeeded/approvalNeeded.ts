import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import axios from 'axios'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ApprovalNeededInput, ApprovalNeededOutput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'

import type {
  OneInchAllowanceApiInput,
  OneInchAllowanceResponse,
  OneInchSwapperDeps,
} from '../utils/types'

export const approvalNeeded = async (
  deps: OneInchSwapperDeps,
  input: ApprovalNeededInput<EvmChainId>,
): Promise<Result<ApprovalNeededOutput, SwapErrorRight>> => {
  const { accountNumber, allowanceContract, sellAmountBeforeFeesCryptoBaseUnit, sellAsset } =
    input.quote

  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(sellAsset.chainId)

  if (adapter === undefined) {
    return Err(
      makeSwapErrorRight({
        message: '[approvalNeeded] - getChainAdapterManager returned undefined',
        code: SwapErrorType.UNSUPPORTED_NAMESPACE,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  const { assetReference: sellAssetErc20Address } = fromAssetId(sellAsset.assetId)

  const receiveAddress = await adapter.getAddress({ accountNumber, wallet: input.wallet })

  if (!allowanceContract) {
    return Err(
      makeSwapErrorRight({
        message: '[approvalNeeded] - allowanceTarget is required',
        code: SwapErrorType.VALIDATION_FAILED,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  const apiInput: OneInchAllowanceApiInput = {
    tokenAddress: sellAssetErc20Address,
    walletAddress: receiveAddress,
  }
  const { chainReference } = fromChainId(sellAsset.chainId)

  const allowanceResponse: AxiosResponse<OneInchAllowanceResponse> = await axios.get(
    `${deps.apiUrl}/${chainReference}/approve/allowance`,
    { params: apiInput },
  )
  const allowanceOnChain = bnOrZero(allowanceResponse.data.allowance)

  return Ok({
    approvalNeeded: allowanceOnChain.lt(bnOrZero(sellAmountBeforeFeesCryptoBaseUnit)),
  })
}
