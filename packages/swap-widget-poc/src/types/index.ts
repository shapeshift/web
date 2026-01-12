export type ChainId = string;
export type AssetId = string;

export type Chain = {
  chainId: ChainId;
  name: string;
  icon: string;
  color: string;
  nativeAssetId: AssetId;
};

export type Asset = {
  assetId: AssetId;
  chainId: ChainId;
  symbol: string;
  name: string;
  precision: number;
  icon?: string;
  color?: string;
  networkName?: string;
  networkIcon?: string;
  explorer?: string;
  explorerTxLink?: string;
  explorerAddressLink?: string;
  relatedAssetKey?: AssetId | null;
};

export type SwapperName =
  | "THORChain"
  | "MAYAChain"
  | "CoW Swap"
  | "0x"
  | "Portals"
  | "Chainflip"
  | "Relay"
  | "Bebop"
  | "Jupiter"
  | "1inch"
  | "ButterSwap"
  | "ArbitrumBridge";

export type TradeQuoteStep = {
  sellAsset: Asset;
  buyAsset: Asset;
  sellAmountCryptoBaseUnit: string;
  buyAmountCryptoBaseUnit: string;
  rate: string;
  source: SwapperName;
  feeData: {
    networkFeeCryptoBaseUnit: string;
    protocolFees?: Record<AssetId, { amountCryptoBaseUnit: string }>;
  };
  allowanceContract?: string;
  estimatedExecutionTimeMs?: number;
};

export type TradeQuote = {
  id: string;
  rate: string;
  swapperName: SwapperName;
  steps: TradeQuoteStep[];
  receiveAddress: string;
  affiliateBps: string;
  slippageTolerancePercentageDecimal?: string;
  isStreaming?: boolean;
};

export type TradeRate = {
  swapperName: SwapperName;
  rate: string;
  buyAmountCryptoBaseUnit: string;
  sellAmountCryptoBaseUnit: string;
  steps: number;
  estimatedExecutionTimeMs?: number;
  affiliateBps: string;
  networkFeeCryptoBaseUnit?: string;
  error?: {
    code: string;
    message: string;
  };
  id?: string;
};

export type ThemeMode = "light" | "dark";

export type ThemeConfig = {
  mode: ThemeMode;
  accentColor?: string;
  backgroundColor?: string;
  cardColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
};

export type SwapWidgetProps = {
  apiKey?: string;
  apiBaseUrl?: string;
  defaultSellAsset?: Asset;
  defaultBuyAsset?: Asset;
  disabledChainIds?: ChainId[];
  disabledAssetIds?: AssetId[];
  allowedChainIds?: ChainId[];
  allowedAssetIds?: AssetId[];
  walletClient?: unknown;
  onConnectWallet?: () => void;
  onSwapSuccess?: (txHash: string) => void;
  onSwapError?: (error: Error) => void;
  onAssetSelect?: (type: "sell" | "buy", asset: Asset) => void;
  theme?: ThemeMode | ThemeConfig;
  defaultSlippage?: string;
  showPoweredBy?: boolean;
};

export type RatesResponse = {
  rates: TradeRate[];
};

export type QuoteResponse = {
  quote: TradeQuote;
  transactionData?: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
  };
};

export type AssetsResponse = {
  byId: Record<AssetId, Asset>;
  ids: AssetId[];
};

export const EVM_CHAIN_IDS = {
  ethereum: "eip155:1",
  arbitrum: "eip155:42161",
  optimism: "eip155:10",
  polygon: "eip155:137",
  base: "eip155:8453",
  avalanche: "eip155:43114",
  bsc: "eip155:56",
  gnosis: "eip155:100",
  arbitrumNova: "eip155:42170",
} as const;

export const UTXO_CHAIN_IDS = {
  bitcoin: "bip122:000000000019d6689c085ae165831e93",
  bitcoinCash: "bip122:000000000000000000651ef99cb9fcbe",
  dogecoin: "bip122:00000000001a91e3dace36e2be3bf030",
  litecoin: "bip122:12a765e31ffd4059bada1e25190f6e98",
} as const;

export const COSMOS_CHAIN_IDS = {
  cosmos: "cosmos:cosmoshub-4",
  thorchain: "cosmos:thorchain-1",
  mayachain: "cosmos:mayachain-mainnet-v1",
} as const;

export const OTHER_CHAIN_IDS = {
  solana: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
} as const;

export const isEvmChainId = (chainId: string): boolean => {
  return chainId.startsWith("eip155:");
};

export const getEvmChainIdNumber = (chainId: string): number => {
  const parts = chainId.split(":");
  return parseInt(parts[1] ?? "1", 10);
};

export const getChainType = (
  chainId: string,
): "evm" | "utxo" | "cosmos" | "solana" | "other" => {
  if (chainId.startsWith("eip155:")) return "evm";
  if (chainId.startsWith("bip122:")) return "utxo";
  if (chainId.startsWith("cosmos:")) return "cosmos";
  if (chainId.startsWith("solana:")) return "solana";
  return "other";
};

export const formatAmount = (
  amount: string,
  decimals: number,
  maxDecimals = 6,
): string => {
  const num = Number(amount) / Math.pow(10, decimals);
  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";
  return num.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
};

export const parseAmount = (amount: string, decimals: number): string => {
  const num = parseFloat(amount) || 0;
  return Math.floor(num * Math.pow(10, decimals)).toString();
};

export const truncateAddress = (address: string, chars = 4): string => {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};
