import { ApprovalNeededOutput, SupportedChainIds } from '@shapeshiftoss/types'

import { ApprovalNeededInput, SwapError, SwapErrorTypes } from '../../../api'
import { erc20AllowanceAbi } from '../utils/abi/erc20Allowance-abi'
import { bnOrZero } from '../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../utils/constants'
import { getERC20Allowance } from '../utils/helpers/helpers'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function ZrxApprovalNeeded(
  { adapterManager, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApprovalNeededInput<SupportedChainIds>
): Promise<ApprovalNeededOutput> {
  const { sellAsset } = quote

  try {
    if (sellAsset.chainId !== 'eip155:1') {
      throw new SwapError('[ZrxApprovalNeeded] - sellAsset chainId is not supported', {
        code: SwapErrorTypes.UNSUPPORTED_CHAIN,
        details: { chainId: sellAsset.chainId }
      })
    }

    // No approval needed for trading eth itself
    if (sellAsset.assetId === 'eip155:1/slip44:60') {
      return { approvalNeeded: false }
    }

    const accountNumber = bnOrZero(quote.sellAssetAccountId).toNumber()

    const adapter = await adapterManager.byChainId(sellAsset.chainId)
    const bip44Params = adapter.buildBIP44Params({ accountNumber })
    const receiveAddress = await adapter.getAddress({ wallet, bip44Params })

    if (!quote.sellAsset.tokenId || !quote.allowanceContract) {
      throw new SwapError('[ZrxApprovalNeeded] - tokenId and allowanceTarget are required', {
        code: SwapErrorTypes.VALIDATION_FAILED,
        details: { chainId: sellAsset.chainId }
      })
    }

    const allowanceResult = await getERC20Allowance({
      web3,
      erc20AllowanceAbi,
      tokenId: quote.sellAsset.tokenId,
      spenderAddress: quote.allowanceContract,
      ownerAddress: receiveAddress
    })
    const allowanceOnChain = bnOrZero(allowanceResult)

    if (!quote.feeData.chainSpecific?.gasPrice)
      throw new SwapError('[ZrxApprovalNeeded] - no gas price with quote', {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { feeData: quote.feeData }
      })
    return {
      approvalNeeded: allowanceOnChain.lte(bnOrZero(quote.sellAmount)),
      gas: APPROVAL_GAS_LIMIT,
      gasPrice: quote.feeData.chainSpecific?.gasPrice
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[ZrxApprovalNeeded]', {
      cause: e,
      code: SwapErrorTypes.CHECK_APPROVAL_FAILED
    })
  }
}
