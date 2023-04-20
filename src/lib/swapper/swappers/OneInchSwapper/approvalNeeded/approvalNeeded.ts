import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { AxiosResponse } from 'axios'
import axios from 'axios'

import type {
  OneInchAllowanceApiInput,
  OneInchAllowanceResponse,
  OneInchSwapperDeps,
} from '../utils/types'
import { ApprovalNeededInput, ApprovalNeededOutput, SwapError, SwapErrorType } from 'lib/swapper/api'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

export const approvalNeeded = async (
  deps: OneInchSwapperDeps,
  input: ApprovalNeededInput<EvmChainId>,
): Promise<ApprovalNeededOutput> => {
  const { accountNumber, allowanceContract, sellAmountBeforeFeesCryptoBaseUnit, sellAsset } =
    input.quote

  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(sellAsset.chainId)

  if (adapter === undefined) {
    throw new SwapError('[approvalNeeded] - getChainAdapterManager returned undefined', {
      code: SwapErrorType.UNSUPPORTED_NAMESPACE,
      details: { chainId: sellAsset.chainId },
    })
  }

  const { assetReference: sellAssetErc20Address } = fromAssetId(sellAsset.assetId)

  try {
    const receiveAddress = await adapter.getAddress({ accountNumber, wallet: input.wallet })

    if (!allowanceContract) {
      throw new SwapError('[approvalNeeded] - allowanceTarget is required', {
        code: SwapErrorType.VALIDATION_FAILED,
        details: { chainId: sellAsset.chainId },
      })
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

    return {
      approvalNeeded: allowanceOnChain.lt(bnOrZero(sellAmountBeforeFeesCryptoBaseUnit)),
    }
  } catch (e) {
    throw new SwapError('[approvalNeeded]', { cause: e, code: SwapErrorType.CHECK_APPROVAL_FAILED })
  }
}
