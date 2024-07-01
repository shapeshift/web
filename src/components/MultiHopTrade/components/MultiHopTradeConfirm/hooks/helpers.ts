import { fromAssetId } from '@shapeshiftoss/caip'
import { type evm, type EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { type ETHWallet } from '@shapeshiftoss/hdwallet-core'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import { MAX_ALLOWANCE } from '@shapeshiftoss/swapper/dist/swappers/utils/constants'
import { getFees } from '@shapeshiftoss/utils/dist/evm'
import { getApproveContractData } from 'lib/utils/evm'

export const getApprovalTxData = async ({
  tradeQuoteStep,
  adapter,
  wallet,
  isExactAllowance,
  from,
  supportsEIP1559,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  adapter: EvmChainAdapter
  wallet: ETHWallet
  isExactAllowance: boolean
  from: string
  supportsEIP1559: boolean
}): Promise<{ buildCustomTxInput: evm.BuildCustomTxInput; networkFeeCryptoBaseUnit: string }> => {
  const approvalAmountCryptoBaseUnit = isExactAllowance
    ? tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit
    : MAX_ALLOWANCE

  const { assetReference } = fromAssetId(tradeQuoteStep.sellAsset.assetId)

  const value = '0'

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit,
    spender: tradeQuoteStep.allowanceContract,
    to: assetReference,
    chainId: tradeQuoteStep.sellAsset.chainId,
  })

  const { networkFeeCryptoBaseUnit, ...fees } = await getFees({
    adapter,
    to: assetReference,
    value,
    data,
    from,
    supportsEIP1559,
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
