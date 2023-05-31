import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { createStore, useStore } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { TradeAmountInputField } from 'components/Trade/types'
import { localAssetData } from 'lib/asset-service'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import {
  clearAmounts,
  handleAssetSelection,
  handleInputAmountChange,
  handleSwitchAssets,
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

export const swapperStore = createStore<
  SwapperState,
  [['zustand/immer', never], ['zustand/devtools', never]]
>(
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
        activeAffiliateBps: '0',

        // Actions
        updateSelectedSellAssetAccountId: createUpdateAction(set, 'selectedSellAssetAccountId'),
        updateSelectedBuyAssetAccountId: createUpdateAction(set, 'selectedBuyAssetAccountId'),
        updateSellAssetAccountId: createUpdateAction(set, 'sellAssetAccountId'),
        updateBuyAssetAccountId: createUpdateAction(set, 'buyAssetAccountId'),
        updateSellAmountFiat: createUpdateAction(set, 'sellAmountFiat'),
        updateBuyAmountFiat: createUpdateAction(set, 'buyAmountFiat'),
        clearAmounts: clearAmounts(set),
        updateAmount: createUpdateAction(set, 'amount'),
        updateAction: createUpdateAction(set, 'action'),
        updateReceiveAddress: createUpdateAction(set, 'receiveAddress'),
        updateFees: updateFees(set),
        updateTrade: createUpdateAction(set, 'trade'),
        updateAvailableSwappersWithMetadata: createUpdateAction(
          set,
          'availableSwappersWithMetadata',
        ),
        handleSwitchAssets: handleSwitchAssets(set),
        handleInputAmountChange: handleInputAmountChange(set),
        handleAssetSelection: handleAssetSelection(set),
        updateTradeAmountsFromQuote: updateTradeAmountsFromQuote(set),
        updateActiveAffiliateBps: createUpdateAction(set, 'activeAffiliateBps'),
        updatePreferredSwapper: createUpdateAction(set, 'preferredSwapper'),
      }),
      { name: 'SwapperStore' },
    ),
  ),
)

export const useSwapperStore = <T>(func: (state: SwapperState) => T) => func(useStore(swapperStore))
