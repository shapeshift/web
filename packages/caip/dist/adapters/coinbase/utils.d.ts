import type { AssetId } from '../../index';
type CoinbaseCurrency = {
    id: string;
    details: {
        crypto_address_link: string | null;
    };
    default_network: string;
};
export declare function parseData(data: CoinbaseCurrency[]): Record<AssetId, string>;
export declare function getData(): Promise<CoinbaseCurrency[]>;
export declare const writeFiles: (data: Record<AssetId, string>) => Promise<void>;
export {};
