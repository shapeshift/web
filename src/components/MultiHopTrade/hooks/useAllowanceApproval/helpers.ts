import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { evm, EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { type ETHWallet, type HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn } from 'lib/bignumber/bignumber'
import { MAX_ALLOWANCE } from 'lib/swapper/swappers/utils/constants'
import type { TradeQuote } from 'lib/swapper/types'
import { getApproveContractData, getErc20Allowance, getFees } from 'lib/utils/evm'

export const checkApprovalNeeded = async (
  tradeQuoteStep: TradeQuote['steps'][number],
  wallet: HDWallet,
  sellAssetAccountId: AccountId,
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

  const fetchUnchainedAddress = Boolean(wallet && isLedger(wallet))
  const from = await adapter.getAddress({
    wallet,
    accountNumber,
    pubKey: fetchUnchainedAddress ? fromAccountId(sellAssetAccountId).account : undefined,
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

export const getApprovalTxData = async ({
  tradeQuoteStep,
  adapter,
  wallet,
  isExactAllowance,
  from,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  adapter: EvmChainAdapter
  wallet: ETHWallet
  isExactAllowance: boolean
  from?: string
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
  })

  const { networkFeeCryptoBaseUnit, ...fees } = await getFees({
    adapter,
    to: assetReference,
    value,
    data,
    ...(from
      ? {
          from,
          supportsEIP1559: await wallet.ethSupportsEIP1559(),
        }
      : { accountNumber: tradeQuoteStep.accountNumber, wallet }),
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
