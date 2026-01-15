import { toAddressNList } from "@shapeshiftoss/chain-adapters";
import { TxStatus } from "@shapeshiftoss/unchained-client";
import type { TradeStatus as OmnistonTradeStatus } from "@ston-fi/omniston-sdk";
import { Blockchain, Omniston } from "@ston-fi/omniston-sdk";

import type { SwapperApi, TradeStatus } from "../../types";
import {
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from "../../utils";
import { getTradeQuote } from "./swapperApi/getTradeQuote";
import { getTradeRate } from "./swapperApi/getTradeRate";
import { STONFI_WEBSOCKET_URL } from "./utils/constants";

const TRADE_TRACKING_TIMEOUT_MS = 60000;
const CONNECTION_TIMEOUT_MS = 10000;

const waitForConnection = (omniston: Omniston): Promise<boolean> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      subscription.unsubscribe();
      resolve(false);
    }, CONNECTION_TIMEOUT_MS);

    const subscription = omniston.connectionStatusEvents.subscribe({
      next: (event) => {
        if (event.status === "connected") {
          clearTimeout(timer);
          subscription.unsubscribe();
          resolve(true);
        }
      },
      error: () => {
        clearTimeout(timer);
        resolve(false);
      },
    });
  });
};

const waitForFirstTradeStatus = async (
  omniston: Omniston,
  request: {
    quoteId: string;
    traderWalletAddress: { blockchain: number; address: string };
    outgoingTxHash: string;
  },
  timeoutMs: number,
): Promise<OmnistonTradeStatus | null> => {
  const isConnected = await waitForConnection(omniston);
  if (!isConnected) {
    console.error("[Stonfi] WebSocket connection timeout");
    return null;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      subscription.unsubscribe();
      resolve(null);
    }, timeoutMs);

    const subscription = omniston.trackTrade(request).subscribe({
      next: (status: OmnistonTradeStatus) => {
        clearTimeout(timer);
        subscription.unsubscribe();
        resolve(status);
      },
      error: (err) => {
        console.error("[Stonfi] trackTrade error:", err);
        clearTimeout(timer);
        resolve(null);
      },
    });
  });
};

export const stonfiApi: SwapperApi = {
  getTradeQuote: (input, _deps) => getTradeQuote(input),
  getTradeRate: (input) => getTradeRate(input),

  getUnsignedTonTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetTonChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error("Unable to execute a trade rate quote");
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex);
    const { accountNumber, sellAsset, stonfiSpecific } = step;

    if (!stonfiSpecific) {
      throw new Error("stonfiSpecific is required");
    }

    const adapter = assertGetTonChainAdapter(sellAsset.chainId);

    const storedQuote = {
      quoteId: stonfiSpecific.quoteId,
      resolverId: stonfiSpecific.resolverId,
      resolverName: stonfiSpecific.resolverName,
      bidAssetAddress: stonfiSpecific.bidAssetAddress,
      askAssetAddress: stonfiSpecific.askAssetAddress,
      bidUnits: stonfiSpecific.bidUnits,
      askUnits: stonfiSpecific.askUnits,
      referrerAddress: stonfiSpecific.referrerAddress,
      referrerFeeAsset: stonfiSpecific.referrerFeeAsset,
      referrerFeeUnits: stonfiSpecific.referrerFeeUnits,
      protocolFeeAsset: stonfiSpecific.protocolFeeAsset,
      protocolFeeUnits: stonfiSpecific.protocolFeeUnits,
      quoteTimestamp: stonfiSpecific.quoteTimestamp,
      tradeStartDeadline: stonfiSpecific.tradeStartDeadline,
      gasBudget: stonfiSpecific.gasBudget,
      estimatedGasConsumption: stonfiSpecific.estimatedGasConsumption,
      params: stonfiSpecific.params,
    };

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const omniston = new Omniston({ apiUrl: STONFI_WEBSOCKET_URL });

      try {
        const txResponse = await omniston.buildTransfer({
          sourceAddress: { blockchain: Blockchain.TON, address: from },
          destinationAddress: {
            blockchain: Blockchain.TON,
            address: tradeQuote.receiveAddress,
          },
          quote: storedQuote as Parameters<
            typeof omniston.buildTransfer
          >[0]["quote"],
          useRecommendedSlippage: true,
        });

        if (
          !txResponse?.ton?.messages ||
          txResponse.ton.messages.length === 0
        ) {
          throw new Error("No TON messages returned from buildTransfer");
        }

        const expireAt = Math.floor(Date.now() / 1000) + 300;

        const rawMessages = txResponse.ton.messages.map((msg) => ({
          targetAddress: msg.targetAddress,
          sendAmount: msg.sendAmount,
          payload: msg.payload,
          stateInit: msg.jettonWalletStateInit,
        }));

        const seqno = await adapter.getSeqno(from);

        return {
          addressNList: toAddressNList(
            adapter.getBip44Params({ accountNumber }),
          ),
          rawMessages,
          seqno,
          expireAt,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(
          `[Stonfi] buildTransfer attempt ${attempt}/${maxRetries} failed:`,
          lastError.message,
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      } finally {
        omniston.close();
      }
    }

    throw lastError ?? new Error("Failed to build transfer after retries");
  },

  getTonTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error("Unable to execute a trade rate quote");
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex);
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error("Missing network fee in quote");
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit);
  },

  checkTradeStatus: async ({
    swap,
    assertGetTonChainAdapter,
  }): Promise<TradeStatus> => {
    if (!swap?.sellTxHash) {
      return createDefaultStatusResponse();
    }

    const { sellTxHash } = swap;

    const checkTxStatusViaChainAdapter = async (): Promise<TradeStatus> => {
      try {
        const adapter = assertGetTonChainAdapter(swap.sellAsset.chainId);
        const tx = await adapter.parseTx(sellTxHash, "");

        console.log("[Stonfi] parseTx result:", {
          sellTxHash,
          status: tx.status,
          txid: tx.txid,
        });

        return {
          status: tx.status,
          buyTxHash: tx.status === TxStatus.Confirmed ? sellTxHash : undefined,
          message: undefined,
        };
      } catch (err) {
        console.error(
          "[Stonfi] Error checking tx status via chain adapter:",
          err,
        );
        return createDefaultStatusResponse(sellTxHash);
      }
    };

    const { metadata } = swap;

    if (!metadata?.quoteId) {
      return checkTxStatusViaChainAdapter();
    }

    const omniston = new Omniston({ apiUrl: STONFI_WEBSOCKET_URL });

    try {
      const tradeStatus = await waitForFirstTradeStatus(
        omniston,
        {
          quoteId: metadata.quoteId,
          traderWalletAddress: {
            blockchain: Blockchain.TON,
            address: swap.sellAccountId.split(":")[2] ?? "",
          },
          outgoingTxHash: sellTxHash,
        },
        TRADE_TRACKING_TIMEOUT_MS,
      );

      if (!tradeStatus?.status) {
        console.log(
          "[Stonfi] Omniston returned no status, falling back to chain adapter",
        );
        return checkTxStatusViaChainAdapter();
      }

      console.log("[Stonfi] Omniston trade status:", tradeStatus.status);
      const statusOneOf = tradeStatus.status;

      if (statusOneOf.awaitingTransfer) {
        return {
          status: TxStatus.Pending,
          buyTxHash: undefined,
          message: "trade.statuses.awaitingDeposit",
        };
      }

      if (statusOneOf.transferring) {
        return {
          status: TxStatus.Pending,
          buyTxHash: undefined,
          message: "trade.statuses.depositing",
        };
      }

      if (statusOneOf.swapping) {
        return {
          status: TxStatus.Pending,
          buyTxHash: undefined,
          message: "trade.statuses.swapping",
        };
      }

      if (statusOneOf.receivingFunds) {
        return {
          status: TxStatus.Pending,
          buyTxHash: undefined,
          message: "trade.statuses.receivingFunds",
        };
      }

      if (statusOneOf.tradeSettled) {
        const result = statusOneOf.tradeSettled.result;

        if (result === "TRADE_RESULT_FULLY_FILLED") {
          return {
            status: TxStatus.Confirmed,
            buyTxHash: sellTxHash,
            message: undefined,
          };
        }

        if (result === "TRADE_RESULT_PARTIALLY_FILLED") {
          return {
            status: TxStatus.Confirmed,
            buyTxHash: sellTxHash,
            message: "trade.statuses.partiallyFilled",
          };
        }

        if (result === "TRADE_RESULT_ABORTED") {
          return {
            status: TxStatus.Failed,
            buyTxHash: undefined,
            message: "trade.statuses.aborted",
          };
        }
      }

      return checkTxStatusViaChainAdapter();
    } catch (err) {
      console.error("[Stonfi] Error checking trade status via Omniston:", err);
      return checkTxStatusViaChainAdapter();
    } finally {
      omniston.close();
    }
  },
};
