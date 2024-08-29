import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import { type AllowanceType, getApprovalAmountCryptoBaseUnit } from 'hooks/queries/useApprovalFees'
import { approve } from 'lib/utils/evm/approve'

export const approveTrade = async ({
  tradeQuoteStep,
  wallet,
  allowanceType,
  from,
  checkLedgerAppOpenIfLedgerConnected,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  wallet: HDWallet
  from: string
  allowanceType: AllowanceType
  checkLedgerAppOpenIfLedgerConnected: (chainId: string) => Promise<void>
}): Promise<string> => {
  const txHash = await approve({
    assetId: tradeQuoteStep.sellAsset.assetId,
    accountNumber: tradeQuoteStep.accountNumber,
    from,
    amountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
      tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      allowanceType,
    ),
    spender: tradeQuoteStep.allowanceContract,
    wallet,
    checkLedgerAppOpenIfLedgerConnected,
  })

  return txHash
}
