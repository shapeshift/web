import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ApproveAmountInput, ApproveInfiniteInput, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { erc20Abi } from '@shapeshiftoss/swapper/dist/swappers/utils/abi/erc20-abi'
import { APPROVAL_GAS_LIMIT } from '@shapeshiftoss/swapper/dist/swappers/utils/constants'
import { grantAllowance } from '@shapeshiftoss/swapper/dist/swappers/utils/helpers/helpers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { MAX_ALLOWANCE } from 'lib/swapper/LifiSwapper/utils/constants'
import { isEvmChainAdapter } from 'lib/utils'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'

const grantAllowanceForAmount = async (
  { quote, wallet }: ApproveAmountInput<EvmChainId>,
  approvalAmountCryptoBaseUnit: string,
) => {
  const chainId = quote.sellAsset.chainId
  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(chainId)
  const web3 = getWeb3InstanceByChainId(chainId)

  if (!isEvmChainId(chainId)) {
    throw new SwapError('[grantAllowanceForAmount] - only EVM chains are supported', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: { chainId },
    })
  }

  if (adapter === undefined) {
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

  const approvalQuote: TradeQuote<EvmChainId> = {
    ...quote,
    sellAmountBeforeFeesCryptoBaseUnit: approvalAmountCryptoBaseUnit,
    feeData: {
      ...quote.feeData,
      chainSpecific: {
        ...quote.feeData.chainSpecific,
        // lifi handles approval gas internally but need to set a gas limit so the
        // approval limit isnt exceeded when the trade is executed.
        // TODO: see if there is a better way than just hardcoding an arbitrary limit
        estimatedGas: APPROVAL_GAS_LIMIT,
      },
    },
  }

  return await grantAllowance({
    quote: approvalQuote,
    wallet,
    adapter,
    erc20Abi,
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
