import type { AssetId } from '../../assetId/assetId';
import type { ChainId } from '../../chainId/chainId';
export type CoingeckoCoin = {
    id: string;
    platforms: Record<string, string>;
};
type AssetMap = Record<ChainId, Record<AssetId, string>>;
export declare const fetchData: (URL: string) => Promise<CoingeckoCoin[]>;
export declare const parseData: (coins: CoingeckoCoin[]) => AssetMap;
export declare const writeFiles: (data: AssetMap) => Promise<void>;
export {};
