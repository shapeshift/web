import {v4 as uuid} from "uuid";
import {Err, Ok, Result} from "@sniptt/monads";
import {KnownChainIds} from "@shapeshiftoss/types";
import {AssetId, CHAIN_NAMESPACE, fromAssetId} from "@shapeshiftoss/caip";

import {
  type GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  type ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  SwapperName,
  TradeQuote,
  TradeQuoteError
} from "../../../types";
import {getRate, makeSwapErrorRight} from "../../../utils";

import {
  CHAINFLIP_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_SWAP_SOURCE,
  CHAINFLIP_SWAP_SOURCE,
  chainIdToChainflipNetwork,
  usdcAsset
} from "../constants";
import {isSupportedAsset, isSupportedChainId} from "../utils/helpers";
import {chainflipService} from "../utils/chainflipService";
import {ChainflipBaasQuoteQuote, ChainflipBaasQuoteQuoteFee} from "../models";
import {getEvmTxFees} from "../txFeeHelpers/evmTxFees/getEvmTxFees";
import {getDefaultSlippageDecimalPercentageForSwapper} from "../../../constants";
// import { getUtxoTxFees } from "../txFeeHelpers/utxoTxFees/getUtxoTxFees";

export const getChainflipTradeQuote = async (
  input: GetTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps: commissionBps,
  } = input

  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedAsset(sellAsset.chainId, sellAsset.symbol)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { chainId: sellAsset.chainId, assetId: sellAsset.assetId },
      }),
    )
  }

  if (!isSupportedAsset(buyAsset.chainId, buyAsset.symbol)) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: TradeQuoteError.UnsupportedTradePair,
        details: { chainId: buyAsset.chainId, assetId: buyAsset.assetId },
      }),
    )
  }

  const sellChainflipChainKey = `${sellAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[sellAsset.chainId as KnownChainIds]}`;
  const buyChainflipChainKey = `${buyAsset.symbol.toLowerCase()}.${chainIdToChainflipNetwork[buyAsset.chainId as KnownChainIds]}`;

  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = deps.config.REACT_APP_CHAINFLIP_API_KEY;
  
  // Subtract the 0.05% BaaS fee to end up at the final displayed commissionBps
  let serviceCommission = parseInt(commissionBps) - 5;
  if (serviceCommission < 0)
    serviceCommission = 0;
  
  const maybeQuoteResponse = await chainflipService.get<ChainflipBaasQuoteQuote[]>(
    `${brokerUrl}/quotes-native?apiKey=${apiKey}&sourceAsset=${sellChainflipChainKey}&destinationAsset=${buyChainflipChainKey}&amount=${sellAmount}&commissionBps=${serviceCommission}`,
  );

  // TODO: Throw SellAmountBelowMinimum if that's the cause (parse error response)
  if (maybeQuoteResponse.isErr()) {
    return Err(
      makeSwapErrorRight({
        message: 'Quote request failed',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const { data: quoteResponse } = maybeQuoteResponse.unwrap()
  
  const defaultSlippage = getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Chainflip);
  
  const getGasFee = async () => {
    const { chainNamespace } = fromAssetId(sellAsset.assetId);

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId);
        return await getEvmTxFees({
          adapter: sellAdapter,
          supportsEIP1559: (input as GetEvmTradeQuoteInput).supportsEIP1559,
          sendAsset: sellChainflipChainKey
        });
      }

      case CHAIN_NAMESPACE.Utxo: {
        // TODO: Figure out BTC gas calc
        return undefined;
        // const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
        // return await getUtxoTxFees({
        //   sellAmountCryptoBaseUnit: sellAmount,
        //   vault,
        //   opReturnData,
        //   pubkey,
        //   sellAdapter,
        // })
      }
      
      case CHAIN_NAMESPACE.Solana: {
        // TODO: Solana gas calc
        return undefined;
      }
    }
    
    return undefined;
  }
  
  const getFeeAsset = (fee: ChainflipBaasQuoteQuoteFee) => {
    if (fee.type === "ingress" || fee.type === "boost")
      return sellAsset;

    if (fee.type === "egress")
      return buyAsset;

    if (fee.type === "liquidity" && fee.asset == sellChainflipChainKey)
      return sellAsset;

    if (fee.type === "liquidity" && fee.asset == buyChainflipChainKey)
      return buyAsset;

    if (fee.type === "liquidity" && fee.asset == "usdc.eth")
      return usdcAsset;

    if (fee.type === "network")
      return usdcAsset;
  }
  
  const getProtocolFees = (singleQuoteResponse: ChainflipBaasQuoteQuote) => {
    const protocolFees: Record<AssetId, ProtocolFee> = {}

    for (const fee of singleQuoteResponse.includedFees!) {
      if (fee.type === "broker")
        continue;

      const asset = getFeeAsset(fee)!
      if (!(asset.assetId in protocolFees)) {
        protocolFees[asset.assetId] = {
          amountCryptoBaseUnit: "0",
          requiresBalance: false,
          asset: asset,
        }
      }
 
      protocolFees[asset.assetId].amountCryptoBaseUnit =
        (BigInt(protocolFees[asset.assetId].amountCryptoBaseUnit) + BigInt(fee.amountNative!)).toString();
    }

    return protocolFees;
  }
  
  const quotes = [];
  
  for (const singleQuoteResponse of quoteResponse) {
    const isStreaming = singleQuoteResponse.type === "dca";
        
    if (singleQuoteResponse.boostQuote) {
      const boostRate = getRate({
        sellAmountCryptoBaseUnit: singleQuoteResponse.boostQuote.ingressAmountNative!,
        buyAmountCryptoBaseUnit: singleQuoteResponse.boostQuote.egressAmountNative!,
        sellAsset,
        buyAsset,
      })
      
      const boostSwapSource = singleQuoteResponse.type === "regular"
        ? CHAINFLIP_BOOST_SWAP_SOURCE
        : CHAINFLIP_DCA_BOOST_SWAP_SOURCE;
      
      const boostTradeQuote: TradeQuote = {
        id: uuid(),
        rate: boostRate,
        receiveAddress: "",
        potentialAffiliateBps: commissionBps,
        affiliateBps: commissionBps,
        isStreaming: isStreaming,
        slippageTolerancePercentageDecimal: defaultSlippage,
        steps: [
          {
            buyAmountBeforeFeesCryptoBaseUnit: singleQuoteResponse.boostQuote.egressAmountNative!,
            buyAmountAfterFeesCryptoBaseUnit: singleQuoteResponse.boostQuote.egressAmountNative!,
            sellAmountIncludingProtocolFeesCryptoBaseUnit: singleQuoteResponse.boostQuote.ingressAmountNative!,
            feeData: {
              networkFeeCryptoBaseUnit: await getGasFee(),
              protocolFees: getProtocolFees(singleQuoteResponse.boostQuote),
            },
            rate: boostRate,
            source: boostSwapSource,
            buyAsset: buyAsset,
            sellAsset: sellAsset,
            accountNumber: 0,
            allowanceContract: "0x0", // Chainflip does not use contracts
            estimatedExecutionTimeMs: singleQuoteResponse.boostQuote.estimatedDurationSeconds! * 1000
          }
        ]
      };

      quotes.push(boostTradeQuote);
    }

    const rate = getRate({
      sellAmountCryptoBaseUnit: singleQuoteResponse.ingressAmountNative!,
      buyAmountCryptoBaseUnit: singleQuoteResponse.egressAmountNative!,
      sellAsset,
      buyAsset,
    })
    
    const swapSource = singleQuoteResponse.type === "regular"
      ? CHAINFLIP_SWAP_SOURCE
      : CHAINFLIP_DCA_SWAP_SOURCE;
        
    const tradeQuote: TradeQuote = {
      id: uuid(),
      rate: rate,
      receiveAddress: "",
      potentialAffiliateBps: commissionBps,
      affiliateBps: commissionBps,
      isStreaming: isStreaming,
      slippageTolerancePercentageDecimal: defaultSlippage,
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: singleQuoteResponse.egressAmountNative!,
          buyAmountAfterFeesCryptoBaseUnit: singleQuoteResponse.egressAmountNative!,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: singleQuoteResponse.ingressAmountNative!,
          feeData: {
            networkFeeCryptoBaseUnit: await getGasFee(),
            protocolFees: getProtocolFees(singleQuoteResponse),
          },
          rate: rate,
          source: swapSource,
          buyAsset: buyAsset,
          sellAsset: sellAsset,
          accountNumber: 0,
          allowanceContract: "0x0", // Chainflip does not use contracts
          estimatedExecutionTimeMs: singleQuoteResponse.estimatedDurationSeconds! * 1000
        }
      ]
    };
    
    quotes.push(tradeQuote);
  }

  return Ok(quotes);
}
