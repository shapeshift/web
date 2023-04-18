import { localAssetData } from '@shapeshiftoss/asset-service'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { TradeAmountInputField } from 'components/Trade/types'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import {
  clearAmounts,
  handleAssetSelection,
  handleInputAmountChange,
  handleSwitchAssets,
  setSwapperDefaultAffiliateBps,
  toggleIsExactAllowance,
  updateFees,
  updateTradeAmountsFromQuote,
} from 'state/zustand/swapperStore/actions'
import type { SetSwapperStoreAction, SwapperState } from 'state/zustand/swapperStore/types'

const createUpdateAction =
  <T extends keyof SwapperState>(set: SetSwapperStoreAction<SwapperState>, key: T) =>
  (value: SwapperState[T]): void =>
    set(() => ({ [key]: value }), false, {
      type: `swapper/update${key.charAt(0).toUpperCase() + key.slice(1)}`,
      value,
    })

export const useSwapperStore = (() => {
  return create<SwapperState>()(
    immer(
      devtools(
        set => ({
          // State (initialize values)
          sellAmountFiat: '0',
          buyAmountFiat: '0',
          amount: '0',
          isExactAllowance: false,
          action: TradeAmountInputField.SELL_CRYPTO,
          isSendMax: false,
          buyAmountCryptoPrecision: '0',
          sellAmountCryptoPrecision: '0',
          buyAsset: localAssetData[foxAssetId] ?? defaultAsset,
          sellAsset: localAssetData[ethAssetId] ?? defaultAsset,
          affiliateBps: '0',

          // Actions
          updateSelectedSellAssetAccountId: createUpdateAction(set, 'selectedSellAssetAccountId'),
          updateSelectedBuyAssetAccountId: createUpdateAction(set, 'selectedBuyAssetAccountId'),
          updateSellAssetAccountId: createUpdateAction(set, 'sellAssetAccountId'),
          updateBuyAssetAccountId: createUpdateAction(set, 'buyAssetAccountId'),
          updateSellAssetFiatRate: createUpdateAction(set, 'sellAssetFiatRate'),
          updateBuyAssetFiatRate: createUpdateAction(set, 'buyAssetFiatRate'),
          updateFeeAssetFiatRate: createUpdateAction(set, 'feeAssetFiatRate'),
          updateSellAmountFiat: createUpdateAction(set, 'sellAmountFiat'),
          updateBuyAmountFiat: createUpdateAction(set, 'buyAmountFiat'),
          updateSellAsset: createUpdateAction(set, 'sellAsset'),
          updateBuyAsset: createUpdateAction(set, 'buyAsset'),
          updateBuyAmountCryptoPrecision: createUpdateAction(set, 'buyAmountCryptoPrecision'),
          updateSellAmountCryptoPrecision: createUpdateAction(set, 'sellAmountCryptoPrecision'),
          clearAmounts: clearAmounts(set),
          updateAmount: createUpdateAction(set, 'amount'),
          updateIsExactAllowance: createUpdateAction(set, 'isExactAllowance'),
          toggleIsExactAllowance: toggleIsExactAllowance(set),
          updateAction: createUpdateAction(set, 'action'),
          updateIsSendMax: createUpdateAction(set, 'isSendMax'),
          updateReceiveAddress: createUpdateAction(set, 'receiveAddress'),
          updateFees: updateFees(set),
          updateTrade: createUpdateAction(set, 'trade'),
          updateActiveSwapperWithMetadata: createUpdateAction(set, 'activeSwapperWithMetadata'),
          updateAvailableSwappersWithMetadata: createUpdateAction(
            set,
            'availableSwappersWithMetadata',
          ),
          handleSwitchAssets: handleSwitchAssets(set),
          updateSelectedCurrencyToUsdRate: createUpdateAction(set, 'selectedCurrencyToUsdRate'),
          handleInputAmountChange: handleInputAmountChange(set),
          handleAssetSelection: handleAssetSelection(set),
          updateTradeAmountsFromQuote: updateTradeAmountsFromQuote(set),
          updateAffiliateBps: createUpdateAction(set, 'affiliateBps'),
          setSwapperDefaultAffiliateBps: setSwapperDefaultAffiliateBps(set),
        }),
        { name: 'SwapperStore' },
      ),
    ),
  )
})()
