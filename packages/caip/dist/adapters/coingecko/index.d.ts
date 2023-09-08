import type { AssetId } from '../../assetId/assetId';
import type { ChainId } from '../../chainId/chainId';
export declare enum CoingeckoAssetPlatform {
    Ethereum = "ethereum",
    Cosmos = "cosmos",
    Polygon = "polygon-pos",
    Gnosis = "xdai",
    Avalanche = "avalanche",
    Thorchain = "thorchain",
    Optimism = "optimistic-ethereum",
    BnbSmartChain = "binance-smart-chain"
}
type CoinGeckoId = string;
export declare const coingeckoBaseUrl = "https://markets.shapeshift.com/api/v3";
export declare const coingeckoProBaseUrl = "https://markets.shapeshift.com/api/v3";
export declare const coingeckoUrl = "https://markets.shapeshift.com/api/v3/coins/list?include_platform=true";
export declare const coingeckoToAssetIds: (id: CoinGeckoId) => AssetId[];
export declare const assetIdToCoingecko: (assetId: AssetId) => CoinGeckoId | undefined;
export declare const chainIdToCoingeckoAssetPlatform: (chainId: ChainId) => string;
export declare const makeCoingeckoAssetUrl: (assetId: AssetId) => string | undefined;
export {};
