import type { Token, Vault } from '@yfi/sdk';
export declare const writeFiles: (data: Record<string, Record<string, string>>) => Promise<void>;
export declare const fetchData: () => Promise<(Token | Vault)[]>;
export declare const parseEthData: (data: (Token | Vault)[]) => Record<string, string>;
export declare const parseData: (d: (Token | Vault)[]) => {
    [x: string]: Record<string, string>;
};
