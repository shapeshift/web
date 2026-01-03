import type {
  QuoteResult,
  RateResult,
  SwapErrorRight,
  SwapperDeps,
  ThorEvmTradeQuote,
  TradeQuote,
  TradeRate,
} from "@shapeshiftoss/swapper";
import {
  getChainIdBySwapper,
  SwapperName,
  TradeType,
} from "@shapeshiftoss/swapper";

import { validateTradeQuote } from "./validateTradeQuote";

import { getConfig } from "@/config";
import { queryClient } from "@/context/QueryClientProvider/queryClient";
import { fetchIsSmartContractAddressQuery } from "@/hooks/useIsSmartContractAddress/useIsSmartContractAddress";
import { getMixPanel } from "@/lib/mixpanel/mixPanelSingleton";
import { assertGetChainAdapter } from "@/lib/utils";
import { assertGetCosmosSdkChainAdapter } from "@/lib/utils/cosmosSdk";
import { assertGetEvmChainAdapter } from "@/lib/utils/evm";
import { assertGetNearChainAdapter } from "@/lib/utils/near";
import { assertGetSolanaChainAdapter } from "@/lib/utils/solana";
import { assertGetStarknetChainAdapter } from "@/lib/utils/starknet";
import { assertGetSuiChainAdapter } from "@/lib/utils/sui";
import { thorchainBlockTimeMs } from "@/lib/utils/thorchain/constants";
import { assertGetTronChainAdapter } from "@/lib/utils/tron";
import { assertGetUtxoChainAdapter } from "@/lib/utils/utxo";
import {
  getInboundAddressesQuery,
  getMimirQuery,
} from "@/react-queries/queries/thornode";
import {
  selectInboundAddressData,
  selectIsTradingActive,
} from "@/react-queries/selectors";
import { getInputOutputRatioFromQuote } from "@/state/apis/swapper/helpers/getInputOutputRatioFromQuote";
import type { ApiQuote } from "@/state/apis/swapper/types";
import type { ReduxState } from "@/state/reducer";
import { selectAssets } from "@/state/slices/assetsSlice/selectors";
import { marketApi } from "@/state/slices/marketDataSlice/marketDataSlice";
import type { AppDispatch } from "@/state/store";

export const hydrateMarketData = async (
  dispatch: AppDispatch,
  sellAssetId: string,
  buyAssetId: string,
) => {
  await Promise.all([
    dispatch(marketApi.endpoints.findByAssetId.initiate(sellAssetId)),
    dispatch(marketApi.endpoints.findByAssetId.initiate(buyAssetId)),
  ]);
};

export const createSwapperDeps = (state: ReduxState): SwapperDeps => ({
  assetsById: selectAssets(state),
  assertGetChainAdapter,
  assertGetEvmChainAdapter,
  assertGetUtxoChainAdapter,
  assertGetCosmosSdkChainAdapter,
  assertGetSolanaChainAdapter,
  assertGetTronChainAdapter,
  assertGetSuiChainAdapter,
  assertGetNearChainAdapter,
  assertGetStarknetChainAdapter,
  fetchIsSmartContractAddressQuery,
  config: getConfig(),
  mixPanel: getMixPanel(),
});

export const processQuoteResultWithRatios = (
  quoteResult: QuoteResult | RateResult,
  getState: () => unknown,
) => {
  if (quoteResult.isErr()) {
    const error: SwapErrorRight = quoteResult.unwrapErr();
    return [
      {
        quote: undefined,
        error,
        inputOutputRatio: -Infinity,
        swapperName: quoteResult.swapperName,
      },
    ];
  }

  return quoteResult.unwrap().map((quote: TradeQuote | TradeRate) => {
    const inputOutputRatio = getInputOutputRatioFromQuote({
      // We need to get the freshest state after fetching market data above
      state: getState() as ReduxState,
      quote,
      swapperName: quoteResult.swapperName,
    });
    return {
      quote,
      error: undefined,
      inputOutputRatio,
      swapperName: quoteResult.swapperName,
    };
  });
};

export const checkTradingActivity = async (
  sellAssetId: string,
  buyAssetId: string,
  swapperName: SwapperName,
  error: SwapErrorRight | undefined,
  tradeType?: TradeType,
) => {
  if (error !== undefined) {
    return {
      isTradingActiveOnSellPool: false,
      isTradingActiveOnBuyPool: false,
    };
  }

  const [isTradingActiveOnSellPool, isTradingActiveOnBuyPool] =
    await Promise.all(
      [sellAssetId, buyAssetId].map(async (assetId) => {
        if (
          ![SwapperName.Thorchain, SwapperName.Mayachain].includes(swapperName)
        )
          return true;

        const chainId = getChainIdBySwapper(swapperName);

        const inboundAddresses = await queryClient.fetchQuery({
          ...getInboundAddressesQuery(chainId),
          staleTime: 0,
          gcTime: 0,
        });

        const inboundAddressResponse = selectInboundAddressData(
          inboundAddresses,
          assetId,
        );

        const mimir = await queryClient.fetchQuery({
          ...getMimirQuery(chainId),
          staleTime: thorchainBlockTimeMs,
        });

        return selectIsTradingActive({
          assetId,
          inboundAddressResponse,
          swapperName,
          mimir,
        });
      }),
    );

  return {
    isTradingActiveOnSellPool:
      tradeType === TradeType.LongTailToL1 || isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool:
      tradeType === TradeType.L1ToLongTail || isTradingActiveOnBuyPool,
  };
};

type CreateApiQuoteParams = {
  sellAssetId: string;
  buyAssetId: string;
  sendAddress?: string;
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string;
  quoteOrRate: "quote" | "rate";
};

export const createApiQuote = async (
  quoteData: {
    quote: TradeQuote | TradeRate | undefined;
    swapperName: SwapperName;
    inputOutputRatio: number;
    error: SwapErrorRight | undefined;
  },
  state: ReduxState,
  params: CreateApiQuoteParams,
): Promise<ApiQuote> => {
  const { quote, swapperName, inputOutputRatio, error } = quoteData;
  const tradeType = (quote as ThorEvmTradeQuote)?.tradeType;

  const quoteSource = quoteData.quote?.steps[0].source ?? quoteData.swapperName;

  const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } =
    await checkTradingActivity(
      params.sellAssetId,
      params.buyAssetId,
      swapperName,
      error,
      tradeType,
    );

  const { errors, warnings } = validateTradeQuote(state, {
    swapperName,
    quote,
    error,
    isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool,
    sendAddress: params.sendAddress,
    inputSellAmountCryptoBaseUnit:
      params.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    quoteOrRate: params.quoteOrRate,
  });

  return {
    id: quoteSource,
    quote,
    swapperName,
    inputOutputRatio,
    errors,
    warnings,
    isStale: false,
  };
};
