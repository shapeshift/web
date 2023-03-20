import type { KnownChainIds } from '@shapeshiftoss/types'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { TradeAmountInputField } from 'components/Trade/types'
import type {
  SetSwapperStoreAction,
  SwapperAction,
  SwapperStore,
} from 'state/zustand/swapperStore/types'

const createUpdateAction =
  <T extends keyof SwapperStore>(set: SetSwapperStoreAction<SwapperStore>, key: T) =>
  (value: SwapperStore[T]): void =>
    set(() => ({ [key]: value }), false, {
      type: `swapper/update${key.charAt(0).toUpperCase() + key.slice(1)}`,
      value,
    })

export type SwapperState<T extends KnownChainIds = KnownChainIds> = SwapperStore<T> & SwapperAction
export const useSwapperStore = (() => {
  return create<SwapperState>()(
    immer(
      devtools(
        set => ({
          // State
          sellAmountFiat: '0',
          buyAmountFiat: '0',
          amount: '0',
          isExactAllowance: false,
          action: TradeAmountInputField.SELL_CRYPTO,
          isSendMax: false,
          buyAmountCryptoPrecision: '0',
          sellAmountCryptoPrecision: '0',

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
          updateTradeAmounts: ({
            fiatSellAmount,
            fiatBuyAmount,
            buyAmountCryptoPrecision,
            sellAmountCryptoPrecision,
          }) => {
            set(
              state => {
                if (fiatSellAmount) state.sellAmountFiat = fiatSellAmount
                if (fiatBuyAmount) state.buyAmountFiat = fiatBuyAmount
                if (buyAmountCryptoPrecision)
                  state.buyAmountCryptoPrecision = buyAmountCryptoPrecision
                if (sellAmountCryptoPrecision)
                  state.sellAmountCryptoPrecision = sellAmountCryptoPrecision
              },
              false,
              {
                type: `swapper/updateTradeAmounts`,
                value: {
                  fiatSellAmount,
                  fiatBuyAmount,
                  buyAmountCryptoPrecision,
                  sellAmountCryptoPrecision,
                },
              },
            )
          },
          clearAmounts: () => {
            set(
              state => {
                state.sellAmountCryptoPrecision = '0'
                state.buyAmountCryptoPrecision = '0'
                state.buyAmountFiat = '0'
                state.sellAmountFiat = '0'
                state.amount = '0'
                state.isSendMax = false
                state.action = TradeAmountInputField.SELL_FIAT
                state.trade = undefined
                state.buyAmountFiat = '0'
                state.sellAmountFiat = '0'
              },
              false,
              `swapper/clearAmounts`,
            )
          },
          updateAmount: createUpdateAction(set, 'amount'),
          updateIsExactAllowance: createUpdateAction(set, 'isExactAllowance'),
          toggleIsExactAllowance: () => {
            set(
              state => {
                state.isExactAllowance = !state.isExactAllowance
              },
              false,
              `swapper/toggleIsExactAllowance`,
            )
          },
          updateAction: createUpdateAction(set, 'action'),
          updateIsSendMax: createUpdateAction(set, 'isSendMax'),
          updateReceiveAddress: createUpdateAction(set, 'receiveAddress'),
          updateFees: createUpdateAction(set, 'fees'),
          updateTrade: createUpdateAction(set, 'trade'),
          updateActiveSwapperWithMetadata: createUpdateAction(set, 'activeSwapperWithMetadata'),
          updateAvailableSwappersWithMetadata: createUpdateAction(
            set,
            'availableSwappersWithMetadata',
          ),
        }),
        { name: 'SwapperStore' },
      ),
    ),
  )
})()
