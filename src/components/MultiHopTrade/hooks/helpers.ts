import { fromAssetId } from '@shapeshiftoss/caip'
import type { evm, EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { ETHWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn } from 'lib/bignumber/bignumber'
import type { TradeQuote } from 'lib/swapper/api'
import { erc20AllowanceAbi } from 'lib/swapper/swappers/utils/abi/erc20Allowance-abi'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import {
  getApproveContractData,
  getERC20Allowance,
  getFeesFromContractData,
} from 'lib/swapper/swappers/utils/helpers/helpers'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'

export const checkApprovalNeeded = async (
  tradeQuoteStep: TradeQuote['steps'][number],
  wallet: HDWallet,
) => {
  const { sellAsset, accountNumber, allowanceContract } = tradeQuoteStep
  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(sellAsset.chainId)

  if (!adapter) throw Error(`no chain adapter found for chain Id: ${sellAsset.chainId}`)
  if (!wallet) throw new Error('no wallet available')

  // No approval needed for selling a fee asset
  if (sellAsset.assetId === adapter.getFeeAssetId()) {
    return false
  }

  const from = await adapter.getAddress({
    wallet,
    accountNumber,
  })

  const { assetReference: sellAssetContractAddress } = fromAssetId(sellAsset.assetId)
  const web3 = getWeb3InstanceByChainId(sellAsset.chainId)

  const allowanceOnChainCryptoBaseUnit = await getERC20Allowance({
    web3,
    erc20AllowanceAbi,
    address: sellAssetContractAddress,
    spender: allowanceContract,
    from,
  })

  // TODO(woodenfurniture): This was pulled from the old implementation but we should check whether we should be
  // including protocol fees in the sell asset here
  return bn(allowanceOnChainCryptoBaseUnit).lt(tradeQuoteStep.sellAmountBeforeFeesCryptoBaseUnit)
}

export const getApprovalTxData = async (
  tradeQuoteStep: TradeQuote['steps'][number],
  adapter: EvmChainAdapter,
  wallet: ETHWallet,
  isExactAllowance: boolean,
): Promise<{
  networkFeeCryptoBaseUnit: string
  buildCustomTxInput: evm.BuildCustomTxInput
}> => {
  const approvalAmountCryptoBaseUnit = isExactAllowance
    ? tradeQuoteStep.sellAmountBeforeFeesCryptoBaseUnit
    : MAX_ALLOWANCE

  const web3 = getWeb3InstanceByChainId(tradeQuoteStep.sellAsset.chainId)

  const { assetReference } = fromAssetId(tradeQuoteStep.sellAsset.assetId)

  const value = '0'

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit,
    spender: tradeQuoteStep.allowanceContract,
    to: assetReference,
    web3,
  })

  const [eip1559Support, from] = await Promise.all([
    wallet.ethSupportsEIP1559(),
    adapter.getAddress({
      wallet,
      accountNumber: tradeQuoteStep.accountNumber,
    }),
  ])

  const { feesWithGasLimit, networkFeeCryptoBaseUnit } = await getFeesFromContractData({
    eip1559Support,
    adapter,
    from,
    to: assetReference,
    value,
    data,
  })

  return {
    networkFeeCryptoBaseUnit,
    buildCustomTxInput: {
      accountNumber: tradeQuoteStep.accountNumber,
      data,
      to: assetReference,
      value,
      wallet,
      ...feesWithGasLimit,
    },
  }
}
