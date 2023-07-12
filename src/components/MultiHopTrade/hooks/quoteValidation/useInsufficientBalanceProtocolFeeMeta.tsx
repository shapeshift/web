import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { walletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ProtocolFee } from 'lib/swapper/api'
import { selectPortfolioAccountBalancesBaseUnit } from 'state/slices/common-selectors'
import {
  selectAccountNumberByAccountId,
  selectPortfolioAccountIdByNumberByChainId,
} from 'state/slices/portfolioSlice/selectors'
import { selectBuyAccountId, selectSellAccountId } from 'state/slices/swappersSlice/selectors'
import {
  selectLastHopBuyAsset,
  selectTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const useInsufficientBalanceProtocolFeeMeta = () => {
  const wallet = useWallet().state.wallet

  const sellAssetAccountId = useAppSelector(selectSellAccountId)
  const buyAssetAccountId = useAppSelector(selectBuyAccountId)
  const sellAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, { accountId: sellAssetAccountId }),
  )

  const lastHopBuyAsset = useAppSelector(selectLastHopBuyAsset)
  const walletSupportsBuyAssetChain =
    lastHopBuyAsset &&
    walletSupportsChain({
      chainId: lastHopBuyAsset.chainId,
      wallet,
    })

  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)

  const portfolioAccountIdByNumberByChainId = useAppSelector(
    selectPortfolioAccountIdByNumberByChainId,
  )
  const portfolioAccountBalancesBaseUnit = useAppSelector(selectPortfolioAccountBalancesBaseUnit)

  const insufficientBalanceProtocolFeeMeta = useMemo(() => {
    if (
      totalProtocolFees === undefined ||
      sellAssetAccountNumber === undefined ||
      !buyAssetAccountId ||
      !walletSupportsBuyAssetChain
    )
      return

    // This is an oversimplification where protocol fees are assumed to be only deducted from
    // account IDs corresponding to the sell asset account number and protocol fee asset chain ID.
    // Later we'll need to handle protocol fees payable from the buy side.
    // The UI can currently only show one error message at a time, so we get the first
    const insufficientBalanceProtocolFee = Object.entries(totalProtocolFees).find(
      ([assetId, protocolFee]: [AssetId, ProtocolFee]) => {
        if (!protocolFee.requiresBalance) return false

        const accountId =
          portfolioAccountIdByNumberByChainId[sellAssetAccountNumber][protocolFee.asset.chainId]
        const balanceCryptoBaseUnit = portfolioAccountBalancesBaseUnit[accountId][assetId]
        return bnOrZero(balanceCryptoBaseUnit).lt(protocolFee.amountCryptoBaseUnit)
      },
    )
    if (!insufficientBalanceProtocolFee) return

    const [, protocolFee] = insufficientBalanceProtocolFee
    return {
      symbol: protocolFee.asset.symbol,
      chainName: getChainAdapterManager().get(protocolFee.asset.chainId)?.getDisplayName(),
    }
  }, [
    buyAssetAccountId,
    portfolioAccountBalancesBaseUnit,
    portfolioAccountIdByNumberByChainId,
    sellAssetAccountNumber,
    totalProtocolFees,
    walletSupportsBuyAssetChain,
  ])

  return insufficientBalanceProtocolFeeMeta
}
