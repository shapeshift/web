import { fromAssetId } from '@shapeshiftoss/caip'
import type { evm, EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { ETHWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn } from 'lib/bignumber/bignumber'
import type { TradeQuote } from 'lib/swapper/api'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import { getApproveContractData, getErc20Allowance, getFees } from 'lib/utils/evm'

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

  const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
    address: sellAssetContractAddress,
    spender: allowanceContract,
    from,
    chainId: sellAsset.chainId,
  })

  return bn(allowanceOnChainCryptoBaseUnit).lt(
    tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )
}

export const getApprovalTxData = async (
  tradeQuoteStep: TradeQuote['steps'][number],
  adapter: EvmChainAdapter,
  wallet: ETHWallet,
  isExactAllowance: boolean,
): Promise<{ buildCustomTxInput: evm.BuildCustomTxInput; networkFeeCryptoBaseUnit: string }> => {
  const approvalAmountCryptoBaseUnit = isExactAllowance
    ? tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit
    : MAX_ALLOWANCE

  const { assetReference } = fromAssetId(tradeQuoteStep.sellAsset.assetId)

  const value = '0'

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit,
    spender: tradeQuoteStep.allowanceContract,
    to: assetReference,
  })

  const { networkFeeCryptoBaseUnit, ...fees } = await getFees({
    accountNumber: tradeQuoteStep.accountNumber,
    wallet,
    adapter,
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
      ...fees,
    },
  }
}
