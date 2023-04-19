import { fromAssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { ApprovalNeededInput, ApprovalNeededOutput } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { COW_SWAP_VAULT_RELAYER_ADDRESS } from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { erc20AllowanceAbi } from 'lib/swapper/swappers/utils/abi/erc20Allowance-abi'
import { bnOrZero } from 'lib/swapper/swappers/utils/bignumber'
import { getERC20Allowance } from 'lib/swapper/swappers/utils/helpers/helpers'

export async function cowApprovalNeeded(
  { adapter, web3 }: CowSwapperDeps,
  { quote, wallet }: ApprovalNeededInput<KnownChainIds.EthereumMainnet>,
): Promise<ApprovalNeededOutput> {
  const { sellAsset } = quote

  const { assetReference: sellAssetErc20Address, assetNamespace } = fromAssetId(sellAsset.assetId)

  try {
    if (assetNamespace !== 'erc20') {
      throw new SwapError('[cowApprovalNeeded] - unsupported asset namespace', {
        code: SwapErrorType.UNSUPPORTED_NAMESPACE,
        details: { assetNamespace },
      })
    }
    const { accountNumber } = quote

    const receiveAddress = await adapter.getAddress({ accountNumber, wallet })

    const allowanceResult = await getERC20Allowance({
      web3,
      erc20AllowanceAbi,
      sellAssetErc20Address,
      spenderAddress: COW_SWAP_VAULT_RELAYER_ADDRESS,
      ownerAddress: receiveAddress,
    })

    const allowanceOnChain = bnOrZero(allowanceResult)

    return {
      approvalNeeded: allowanceOnChain.lt(bnOrZero(quote.sellAmountBeforeFeesCryptoBaseUnit)),
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[cowApprovalNeeded]', {
      cause: e,
      code: SwapErrorType.CHECK_APPROVAL_FAILED,
    })
  }
}
