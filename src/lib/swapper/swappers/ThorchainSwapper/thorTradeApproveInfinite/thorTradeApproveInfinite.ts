import { fromAssetId } from '@shapeshiftoss/caip'
import type { ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { ApproveInfiniteInput } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { grantAllowance } from 'lib/swapper/swappers/utils/helpers/helpers'

import { MAX_ALLOWANCE } from '../../utils/constants'

export const thorTradeApproveInfinite = ({
  deps: { adapterManager, web3 },
  input: { quote, wallet },
}: {
  deps: ThorchainSwapperDeps
  input: ApproveInfiniteInput<KnownChainIds.EthereumMainnet>
}): Promise<string> => {
  const adapter = adapterManager.get(KnownChainIds.EthereumMainnet) as unknown as
    | ethereum.ChainAdapter
    | undefined

  if (!adapter) {
    throw new SwapError(
      `[thorTradeApproveInfinite] - No chain adapter found for ${quote.sellAsset.chainId}.`,
      { code: SwapErrorType.UNSUPPORTED_CHAIN },
    )
  }

  return grantAllowance({
    accountNumber: quote.accountNumber,
    spender: quote.allowanceContract,
    feeData: quote.feeData.chainSpecific,
    approvalAmount: MAX_ALLOWANCE,
    to: fromAssetId(quote.sellAsset.assetId).assetReference,
    wallet,
    adapter,
    web3,
  })
}
