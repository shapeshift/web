import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { ApproveAmountInput, ApproveInfiniteInput } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/LifiSwapper/utils/constants'
import { grantAllowance } from 'lib/swapper/swappers/utils/helpers/helpers'
import { isEvmChainAdapter } from 'lib/utils'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'

const grantAllowanceForAmount = (
  { quote, wallet }: ApproveAmountInput<EvmChainId>,
  approvalAmountCryptoBaseUnit: string,
) => {
  const { accountNumber, allowanceContract, feeData, sellAsset } = quote

  const chainId = sellAsset.chainId
  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(chainId)
  const web3 = getWeb3InstanceByChainId(chainId)

  if (!adapter) {
    throw new SwapError('[grantAllowanceForAmount] - getChainAdapterManager returned undefined', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: { chainId },
    })
  }

  if (!isEvmChainAdapter(adapter)) {
    throw new SwapError('[grantAllowanceForAmount] - non-EVM chain adapter detected', {
      code: SwapErrorType.EXECUTE_TRADE_FAILED,
      details: {
        chainAdapterName: adapter.getDisplayName(),
        chainId: adapter.getChainId(),
      },
    })
  }

  return grantAllowance({
    accountNumber,
    spender: allowanceContract,
    feeData,
    approvalAmount: approvalAmountCryptoBaseUnit,
    erc20ContractAddress: fromAssetId(sellAsset.assetId).assetReference,
    wallet,
    adapter,
    web3,
  })
}

export async function approveAmount(args: ApproveAmountInput<EvmChainId>) {
  try {
    // If no amount is specified we use the quotes sell amount
    const approvalAmountCryptoBaseUnit =
      args.amount ?? args.quote.sellAmountBeforeFeesCryptoBaseUnit
    return await grantAllowanceForAmount(args, approvalAmountCryptoBaseUnit)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[approveAmount]', {
      cause: e,
      code: SwapErrorType.APPROVE_AMOUNT_FAILED,
    })
  }
}

export async function approveInfinite(args: ApproveInfiniteInput<EvmChainId>) {
  try {
    return await grantAllowanceForAmount(args, MAX_ALLOWANCE)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[approveInfinite]', {
      cause: e,
      code: SwapErrorType.APPROVE_INFINITE_FAILED,
    })
  }
}
