import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { ApprovalNeededInput, ApprovalNeededOutput, SwapError, SwapErrorType } from '../../../api'
import { erc20AllowanceAbi } from '../../utils/abi/erc20Allowance-abi'
import { bnOrZero } from '../../utils/bignumber'
import { getERC20Allowance } from '../../utils/helpers/helpers'
import { CowSwapperDeps } from '../CowSwapper'
import { COW_SWAP_VAULT_RELAYER_ADDRESS } from '../utils/constants'

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
