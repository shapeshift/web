import { useState, useMemo, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { encodeFunctionData } from "viem";
import type { WalletClient } from "viem";
import { createApiClient } from "../api/client";
import { useSwapRates } from "../hooks/useSwapRates";
import { useChainInfo } from "../hooks/useAssets";
import { useMarketData, formatUsdValue } from "../hooks/useMarketData";
import { useAssetBalance } from "../hooks/useBalances";
import type { Asset, TradeRate, SwapWidgetProps, ThemeMode } from "../types";
import {
  getEvmChainIdNumber,
  parseAmount,
  formatAmount,
  getChainType,
  truncateAddress,
} from "../types";
import { TokenSelectModal } from "./TokenSelectModal";
import { SettingsModal } from "./SettingsModal";
import { QuoteSelector } from "./QuoteSelector";
import "./SwapWidget.css";

const DEFAULT_SELL_ASSET: Asset = {
  assetId: "eip155:1/slip44:60",
  chainId: "eip155:1",
  symbol: "ETH",
  name: "Ethereum",
  precision: 18,
  icon: "https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/ethereum/info/logo.png",
};

const DEFAULT_BUY_ASSET: Asset = {
  assetId: "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  chainId: "eip155:1",
  symbol: "USDC",
  name: "USD Coin",
  precision: 6,
  icon: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

type SwapWidgetInnerProps = SwapWidgetProps & {
  apiClient: ReturnType<typeof createApiClient>;
};

const SwapWidgetInner = ({
  defaultSellAsset = DEFAULT_SELL_ASSET,
  defaultBuyAsset = DEFAULT_BUY_ASSET,
  disabledChainIds = [],
  disabledAssetIds = [],
  walletClient,
  onConnectWallet,
  onSwapSuccess,
  onSwapError,
  onAssetSelect,
  theme = "dark",
  defaultSlippage = "0.5",
  showPoweredBy = true,
  apiClient,
}: SwapWidgetInnerProps) => {
  const [sellAsset, setSellAsset] = useState<Asset>(defaultSellAsset);
  const [buyAsset, setBuyAsset] = useState<Asset>(defaultBuyAsset);
  const [sellAmount, setSellAmount] = useState("");
  const [selectedRate, setSelectedRate] = useState<TradeRate | null>(null);
  const [slippage, setSlippage] = useState(defaultSlippage);
  const [isExecuting, setIsExecuting] = useState(false);
  const [txStatus, setTxStatus] = useState<{
    status: "pending" | "success" | "error";
    txHash?: string;
    message?: string;
  } | null>(null);

  const [tokenModalType, setTokenModalType] = useState<"sell" | "buy" | null>(
    null,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const themeMode: ThemeMode = typeof theme === "string" ? theme : theme.mode;
  const themeConfig = typeof theme === "object" ? theme : undefined;

  const sellAmountBaseUnit = useMemo(
    () =>
      sellAmount ? parseAmount(sellAmount, sellAsset.precision) : undefined,
    [sellAmount, sellAsset.precision],
  );

  const isSellAssetEvm = getChainType(sellAsset.chainId) === "evm";
  const isBuyAssetEvm = getChainType(buyAsset.chainId) === "evm";
  const canExecuteDirectly = isSellAssetEvm && isBuyAssetEvm;

  const {
    data: rates,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useSwapRates(apiClient, {
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit: sellAmountBaseUnit,
    enabled:
      !!sellAmountBaseUnit && sellAmountBaseUnit !== "0" && isSellAssetEvm,
  });

  const walletAddress = useMemo(() => {
    if (!walletClient) return undefined;
    return (walletClient as WalletClient).account?.address;
  }, [walletClient]);

  const {
    data: sellAssetBalance,
    isLoading: isSellBalanceLoading,
    refetch: refetchSellBalance,
  } = useAssetBalance(walletAddress, sellAsset.assetId, sellAsset.precision);
  const {
    data: buyAssetBalance,
    isLoading: isBuyBalanceLoading,
    refetch: refetchBuyBalance,
  } = useAssetBalance(walletAddress, buyAsset.assetId, buyAsset.precision);

  const handleSwapTokens = useCallback(() => {
    const tempSell = sellAsset;
    setSellAsset(buyAsset);
    setBuyAsset(tempSell);
    setSellAmount("");
    setSelectedRate(null);
  }, [sellAsset, buyAsset]);

  const handleSellAssetSelect = useCallback(
    (asset: Asset) => {
      setSellAsset(asset);
      setSelectedRate(null);
      onAssetSelect?.("sell", asset);
    },
    [onAssetSelect],
  );

  const handleBuyAssetSelect = useCallback(
    (asset: Asset) => {
      setBuyAsset(asset);
      setSelectedRate(null);
      onAssetSelect?.("buy", asset);
    },
    [onAssetSelect],
  );

  const handleExecuteSwap = useCallback(async () => {
    if (!isSellAssetEvm) {
      const params = new URLSearchParams({
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmount,
      });
      window.open(
        `https://app.shapeshift.com/trade?${params.toString()}`,
        "_blank",
      );
      return;
    }

    const rateToUse = selectedRate ?? rates?.[0];
    if (!rateToUse || !walletClient || !walletAddress) return;

    if (!canExecuteDirectly) {
      const params = new URLSearchParams({
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmount,
      });
      window.open(
        `https://app.shapeshift.com/trade?${params.toString()}`,
        "_blank",
      );
      return;
    }

    setIsExecuting(true);

    try {
      const requiredChainId = getEvmChainIdNumber(sellAsset.chainId);
      const client = walletClient as WalletClient;

      const currentChainId = await client.getChainId();
      if (currentChainId !== requiredChainId) {
        await client.switchChain({ id: requiredChainId });
      }

      const slippageDecimal = (parseFloat(slippage) / 100).toString();
      const quoteResponse = await apiClient.getQuote({
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit: sellAmountBaseUnit!,
        sendAddress: walletAddress,
        receiveAddress: walletAddress,
        swapperName: rateToUse.swapperName,
        slippageTolerancePercentageDecimal: slippageDecimal,
      });

      const chain = {
        id: requiredChainId,
        name: "Chain",
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [] } },
      };

      if (quoteResponse.approval?.isRequired) {
        const sellAssetAddress = sellAsset.assetId.split("/")[1]?.split(":")[1];
        if (sellAssetAddress) {
          const approvalData = encodeFunctionData({
            abi: [
              {
                name: "approve",
                type: "function",
                inputs: [
                  { name: "spender", type: "address" },
                  { name: "amount", type: "uint256" },
                ],
                outputs: [{ name: "", type: "bool" }],
              },
            ],
            functionName: "approve",
            args: [
              quoteResponse.approval.spender as `0x${string}`,
              BigInt(sellAmountBaseUnit!),
            ],
          });

          await client.sendTransaction({
            to: sellAssetAddress as `0x${string}`,
            data: approvalData,
            value: BigInt(0),
            chain,
            account: walletAddress as `0x${string}`,
          });
        }
      }

      const outerStep = quoteResponse.steps?.[0];
      const innerStep = quoteResponse.quote?.steps?.[0];

      const transactionData =
        quoteResponse.transactionData ??
        outerStep?.transactionData ??
        outerStep?.relayTransactionMetadata ??
        outerStep?.butterSwapTransactionMetadata ??
        innerStep?.transactionData ??
        innerStep?.relayTransactionMetadata ??
        innerStep?.butterSwapTransactionMetadata;

      if (!transactionData) {
        throw new Error(
          `No transaction data returned. Response keys: ${Object.keys(
            quoteResponse,
          ).join(", ")}`,
        );
      }

      const to = transactionData.to as string;
      const data = transactionData.data as string;
      const value = transactionData.value ?? "0";
      const gasLimit = transactionData.gasLimit as string | undefined;

      setTxStatus({
        status: "pending",
        message: "Waiting for confirmation...",
      });

      const txHash = await client.sendTransaction({
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        value: BigInt(value),
        gas: gasLimit ? BigInt(gasLimit) : undefined,
        chain,
        account: walletAddress as `0x${string}`,
      });

      setTxStatus({ status: "success", txHash, message: "Swap successful!" });
      onSwapSuccess?.(txHash);

      setSellAmount("");
      setSelectedRate(null);

      setTimeout(() => {
        refetchSellBalance?.();
        refetchBuyBalance?.();
      }, 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Transaction failed";
      setTxStatus({ status: "error", message: errorMessage });
      onSwapError?.(error as Error);
    } finally {
      setIsExecuting(false);
    }
  }, [
    selectedRate,
    rates,
    walletClient,
    walletAddress,
    canExecuteDirectly,
    isSellAssetEvm,
    sellAsset,
    buyAsset,
    sellAmount,
    sellAmountBaseUnit,
    slippage,
    apiClient,
    onSwapSuccess,
    onSwapError,
    refetchSellBalance,
    refetchBuyBalance,
  ]);

  const handleButtonClick = useCallback(() => {
    if (!walletClient && canExecuteDirectly && onConnectWallet) {
      onConnectWallet();
      return;
    }
    handleExecuteSwap();
  }, [walletClient, canExecuteDirectly, onConnectWallet, handleExecuteSwap]);

  const buttonText = useMemo(() => {
    if (!sellAmount) return "Enter an amount";
    if (!isSellAssetEvm) return "Proceed on ShapeShift";
    if (!walletClient && canExecuteDirectly) return "Connect Wallet";
    if (isLoadingRates) return "Finding rates...";
    if (ratesError) return "No routes available";
    if (!rates?.length) return "No routes found";
    if (isExecuting) return "Executing...";
    if (!canExecuteDirectly) return "Proceed on ShapeShift";
    return "Swap";
  }, [
    walletClient,
    canExecuteDirectly,
    isSellAssetEvm,
    sellAmount,
    isLoadingRates,
    ratesError,
    rates,
    isExecuting,
  ]);

  const isButtonDisabled = useMemo(() => {
    if (!sellAmount) return true;
    if (!isSellAssetEvm) return false;
    if (isLoadingRates) return true;
    if (ratesError) return true;
    if (!rates?.length) return true;
    if (isExecuting) return true;
    return false;
  }, [
    sellAmount,
    isSellAssetEvm,
    isLoadingRates,
    ratesError,
    rates,
    isExecuting,
  ]);

  const { data: sellChainInfo } = useChainInfo(sellAsset.chainId);
  const { data: buyChainInfo } = useChainInfo(buyAsset.chainId);
  const displayRate = selectedRate ?? rates?.[0];
  const buyAmount = displayRate?.buyAmountCryptoBaseUnit;

  const assetIdsForPrices = useMemo(
    () => [sellAsset.assetId, buyAsset.assetId],
    [sellAsset.assetId, buyAsset.assetId],
  );
  const { data: marketData } = useMarketData(assetIdsForPrices);
  const sellAssetUsdPrice = marketData?.[sellAsset.assetId]?.price;
  const buyAssetUsdPrice = marketData?.[buyAsset.assetId]?.price;

  const sellUsdValue = useMemo(() => {
    if (!sellAmountBaseUnit || !sellAssetUsdPrice) return "$0.00";
    return formatUsdValue(
      sellAmountBaseUnit,
      sellAsset.precision,
      sellAssetUsdPrice,
    );
  }, [sellAmountBaseUnit, sellAsset.precision, sellAssetUsdPrice]);

  const buyUsdValue = useMemo(() => {
    if (!buyAmount || !buyAssetUsdPrice) return "$0.00";
    return formatUsdValue(buyAmount, buyAsset.precision, buyAssetUsdPrice);
  }, [buyAmount, buyAsset.precision, buyAssetUsdPrice]);

  const widgetStyle = useMemo(() => {
    if (!themeConfig) return undefined;
    const style: Record<string, string> = {};
    if (themeConfig.accentColor) {
      style["--ssw-accent"] = themeConfig.accentColor;
      style["--ssw-accent-light"] = `${themeConfig.accentColor}1a`;
    }
    if (themeConfig.backgroundColor) {
      style["--ssw-bg-secondary"] = themeConfig.backgroundColor;
      style["--ssw-bg-primary"] = themeConfig.backgroundColor;
    }
    if (themeConfig.cardColor) {
      style["--ssw-bg-tertiary"] = themeConfig.cardColor;
      style["--ssw-bg-input"] = themeConfig.cardColor;
    }
    if (themeConfig.textColor) {
      style["--ssw-text-primary"] = themeConfig.textColor;
    }
    if (themeConfig.borderRadius) {
      style["--ssw-border-radius"] = themeConfig.borderRadius;
    }
    return Object.keys(style).length > 0
      ? (style as React.CSSProperties)
      : undefined;
  }, [themeConfig]);

  return (
    <div
      className={`ssw-widget ${
        themeMode === "light" ? "ssw-light" : "ssw-dark"
      }`}
      style={widgetStyle}
    >
      <div className="ssw-header">
        <span className="ssw-header-title">Swap</span>
        <button
          className="ssw-settings-btn"
          onClick={() => setIsSettingsOpen(true)}
          type="button"
          title="Settings"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <div className="ssw-swap-container">
        <div className="ssw-token-section ssw-sell">
          <div className="ssw-section-header">
            <span className="ssw-section-label">Sell</span>
            {walletAddress && isSellAssetEvm && (
              <span className="ssw-wallet-badge">
                {truncateAddress(walletAddress)}
              </span>
            )}
          </div>

          <div className="ssw-input-row">
            <input
              type="text"
              className="ssw-amount-input"
              placeholder="0"
              value={sellAmount}
              onChange={(e) => {
                setSellAmount(e.target.value.replace(/[^0-9.]/g, ""));
                setSelectedRate(null);
              }}
            />
            <button
              className="ssw-token-btn"
              onClick={() => setTokenModalType("sell")}
              type="button"
            >
              {sellAsset.icon ? (
                <img
                  src={sellAsset.icon}
                  alt={sellAsset.symbol}
                  className="ssw-token-icon"
                />
              ) : (
                <div className="ssw-token-icon-placeholder">
                  {sellAsset.symbol.charAt(0)}
                </div>
              )}
              <div className="ssw-token-info">
                <span className="ssw-token-symbol">{sellAsset.symbol}</span>
                <span className="ssw-token-chain">
                  {sellChainInfo?.name ??
                    sellAsset.networkName ??
                    sellAsset.name}
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="ssw-section-footer">
            <span className="ssw-usd-value">{sellUsdValue}</span>
            {walletAddress &&
              (isSellBalanceLoading ? (
                <span className="ssw-balance-skeleton" />
              ) : sellAssetBalance ? (
                <span className="ssw-balance">
                  Balance: {sellAssetBalance.balanceFormatted}
                </span>
              ) : null)}
          </div>
        </div>

        <div className="ssw-swap-divider">
          <button
            className="ssw-swap-btn"
            onClick={handleSwapTokens}
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>

        <div className="ssw-token-section ssw-buy">
          <div className="ssw-section-header">
            <span className="ssw-section-label">Buy</span>
            {walletAddress && isBuyAssetEvm && (
              <span className="ssw-wallet-badge">
                {truncateAddress(walletAddress)}
              </span>
            )}
          </div>

          <div className="ssw-input-row">
            <input
              type="text"
              className="ssw-amount-input"
              placeholder="0"
              value={
                buyAmount ? formatAmount(buyAmount, buyAsset.precision) : ""
              }
              readOnly
            />
            <button
              className="ssw-token-btn"
              onClick={() => setTokenModalType("buy")}
              type="button"
            >
              {buyAsset.icon ? (
                <img
                  src={buyAsset.icon}
                  alt={buyAsset.symbol}
                  className="ssw-token-icon"
                />
              ) : (
                <div className="ssw-token-icon-placeholder">
                  {buyAsset.symbol.charAt(0)}
                </div>
              )}
              <div className="ssw-token-info">
                <span className="ssw-token-symbol">{buyAsset.symbol}</span>
                <span className="ssw-token-chain">
                  {buyChainInfo?.name ?? buyAsset.networkName ?? buyAsset.name}
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="ssw-section-footer">
            <span className="ssw-usd-value">{buyUsdValue}</span>
            {walletAddress &&
              (isBuyBalanceLoading ? (
                <span className="ssw-balance-skeleton" />
              ) : buyAssetBalance ? (
                <span className="ssw-balance">
                  Balance: {buyAssetBalance.balanceFormatted}
                </span>
              ) : null)}
          </div>
        </div>
      </div>

      {sellAmountBaseUnit &&
        sellAmountBaseUnit !== "0" &&
        (rates?.length || isLoadingRates) && (
          <div className="ssw-quotes">
            <QuoteSelector
              rates={rates ?? []}
              selectedRate={selectedRate}
              onSelectRate={setSelectedRate}
              buyAsset={buyAsset}
              sellAsset={sellAsset}
              sellAmountBaseUnit={sellAmountBaseUnit}
              isLoading={isLoadingRates}
              buyAssetUsdPrice={buyAssetUsdPrice}
            />
          </div>
        )}

      <button
        className={`ssw-action-btn ${
          !canExecuteDirectly ? "ssw-secondary" : ""
        }`}
        disabled={isButtonDisabled}
        onClick={handleButtonClick}
        type="button"
      >
        {buttonText}
      </button>

      {txStatus && (
        <div className={`ssw-tx-status ssw-tx-status-${txStatus.status}`}>
          <div className="ssw-tx-status-icon">
            {txStatus.status === "pending" && (
              <svg
                className="ssw-spinner"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            )}
            {txStatus.status === "success" && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            {txStatus.status === "error" && (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            )}
          </div>
          <div className="ssw-tx-status-content">
            <span className="ssw-tx-status-message">{txStatus.message}</span>
            {txStatus.txHash && (
              <a
                href={`${
                  sellAsset.explorerTxLink ?? "https://etherscan.io/tx/"
                }${txStatus.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ssw-tx-status-link"
              >
                View transaction
              </a>
            )}
          </div>
          <button
            className="ssw-tx-status-close"
            onClick={() => setTxStatus(null)}
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showPoweredBy && (
        <div className="ssw-powered-by">
          Powered by{" "}
          <a
            href="https://shapeshift.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ssw-powered-by-link"
          >
            <svg width="16" height="16" viewBox="0 0 57 62" fill="currentColor">
              <path d="M51.67 5.1L48.97 21.3L39.37 10L51.67 5.1ZM49.03 28.27L51.43 37.14L33.06 42.2L49.03 28.27ZM9.03 23.8L18.88 10.93H35.99L46.92 23.8H9.03ZM45.66 26.99L27.85 42.53L9.7 26.99H45.66ZM15.58 10.01L6.78 21.51L4.08 5.17L15.58 10.01ZM22.57 42.2L4.02 37.15L6.56 28.48L22.57 42.2ZM25.99 46.43L22.49 50.28C19.53 47.46 16.26 44.96 12.78 42.83L25.99 46.43ZM42.98 42.77C39.5 44.94 36.24 47.47 33.29 50.32L29.72 46.42L42.98 42.77ZM55.73 0.06L36.42 7.75H18.42L0 0L4.18 25.3L0.17 38.99L10.65 45.26C15.61 48.23 20.06 51.94 23.86 56.3L27.94 60.97L32.23 56.06C35.9 51.84 40.18 48.22 44.95 45.29L55.23 38.99L51.52 25.31L55.73 0.06Z" />
            </svg>
            ShapeShift
          </a>
        </div>
      )}

      <TokenSelectModal
        isOpen={tokenModalType !== null}
        onClose={() => setTokenModalType(null)}
        onSelect={
          tokenModalType === "sell"
            ? handleSellAssetSelect
            : handleBuyAssetSelect
        }
        disabledAssetIds={disabledAssetIds}
        disabledChainIds={disabledChainIds}
        walletAddress={walletAddress}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        slippage={slippage}
        onSlippageChange={setSlippage}
      />
    </div>
  );
};

export const SwapWidget = (props: SwapWidgetProps) => {
  const apiClient = useMemo(
    () => createApiClient({ baseUrl: props.apiBaseUrl, apiKey: props.apiKey }),
    [props.apiBaseUrl, props.apiKey],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SwapWidgetInner {...props} apiClient={apiClient} />
    </QueryClientProvider>
  );
};
