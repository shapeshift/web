import type { KnownChainIds } from '@shapeshiftoss/types'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
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
  <T extends keyof SwapperStore>(set: SetSwapperStoreAction<SwapperStore>, key: string) =>
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
          fiatSellAmount: '0',
          fiatBuyAmount: '0',
          sellTradeAsset: { amountCryptoPrecision: '0', asset: undefined },
          buyTradeAsset: { amountCryptoPrecision: '0', asset: undefined },
          amount: '0',
          isExactAllowance: false,
          slippage: DEFAULT_SLIPPAGE,
          action: TradeAmountInputField.SELL_CRYPTO,
          isSendMax: false,
          receiveAddress: undefined,
          fees: undefined,
          trade: undefined,
          sellAssetFiatRate: undefined,
          buyAssetFiatRate: undefined,
          feeAssetFiatRate: undefined,
          quote: undefined,
          selectedSellAssetAccountId: undefined,
          selectedBuyAssetAccountId: undefined,
          sellAssetAccountId: undefined,
          buyAssetAccountId: undefined,

          // Actions
          updateSelectedSellAssetAccountId: createUpdateAction(set, 'selectedSellAssetAccountId'),
          updateSelectedBuyAssetAccountId: createUpdateAction(set, 'selectedBuyAssetAccountId'),
          updateSellAssetAccountId: createUpdateAction(set, 'sellAssetAccountId'),
          updateBuyAssetAccountId: createUpdateAction(set, 'buyAssetAccountId'),
          updateQuote: createUpdateAction(set, 'quote'),
          updateSellAssetFiatRate: createUpdateAction(set, 'sellAssetFiatRate'),
          updateBuyAssetFiatRate: createUpdateAction(set, 'buyAssetFiatRate'),
          updateFeeAssetFiatRate: createUpdateAction(set, 'feeAssetFiatRate'),
          updateFiatSellAmount: createUpdateAction(set, 'fiatSellAmount'),
          updateFiatBuyAmount: createUpdateAction(set, 'fiatBuyAmount'),
          updateBuyTradeAsset: createUpdateAction(set, 'buyTradeAsset'),
          updateSellTradeAsset: createUpdateAction(set, 'sellTradeAsset'),
          updateTradeAmounts: ({
            fiatSellAmount,
            fiatBuyAmount,
            buyAmountCryptoPrecision,
            sellAmountCryptoPrecision,
          }) => {
            set(
              state => {
                if (fiatSellAmount) state.fiatSellAmount = fiatSellAmount
                if (fiatBuyAmount) state.fiatBuyAmount = fiatBuyAmount
                if (fiatBuyAmount && state.buyTradeAsset?.amountCryptoPrecision)
                  state.buyTradeAsset.amountCryptoPrecision = buyAmountCryptoPrecision
                if (fiatSellAmount && state.sellTradeAsset?.amountCryptoPrecision)
                  state.sellTradeAsset.amountCryptoPrecision = sellAmountCryptoPrecision
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
                if (state.sellTradeAsset?.amountCryptoPrecision)
                  state.sellTradeAsset.amountCryptoPrecision = ''
                if (state.buyTradeAsset?.amountCryptoPrecision)
                  state.buyTradeAsset.amountCryptoPrecision = ''
                state.fiatBuyAmount = '0'
                state.fiatSellAmount = '0'
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
          updateSlippage: createUpdateAction(set, 'slippage'),
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
