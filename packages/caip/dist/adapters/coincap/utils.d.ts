export type CoinCapCoin = {
    id: string;
    rank: string;
    symbol: string;
    name: string;
    supply: string;
    maxSupply: string | null;
    marketCapUsd: string;
    volumeUsd24Hr: string;
    priceUsd: string;
    changePercent24Hr: string;
    vwap24Hr: string;
    explorer: string | null;
};
export declare const writeFiles: (data: Record<string, Record<string, string>>) => Promise<void>;
export declare const fetchData: (URL: string) => Promise<CoinCapCoin[]>;
export declare const parseEthData: (data: CoinCapCoin[]) => Record<string, string>;
export declare const parseData: (d: CoinCapCoin[]) => {
    [x: string]: {
        [x: string]: string;
    };
};
