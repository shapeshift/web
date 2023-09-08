import type { ChainId, ChainNamespace, ChainReference } from '../chainId/chainId';
import type { Nominal } from '../utils';
export type AccountId = Nominal<string, 'AccountId'>;
type ToAccountIdWithChainId = {
    chainId: ChainId;
    account: string;
    chainNamespace?: never;
    chainReference?: never;
};
type ToAccountIdWithChainIdParts = {
    chainId?: never;
    account: string;
    chainNamespace: ChainNamespace;
    chainReference: ChainReference;
};
type ToAccountIdArgs = ToAccountIdWithChainId | ToAccountIdWithChainIdParts;
type ToAccountId = (args: ToAccountIdArgs) => AccountId;
export declare const toAccountId: ToAccountId;
type FromAccountIdReturn = {
    chainId: ChainId;
    account: string;
    chainNamespace: ChainNamespace;
    chainReference: ChainReference;
};
type FromAccountId = (accountId: AccountId) => FromAccountIdReturn;
export declare const fromAccountId: FromAccountId;
export declare const toCAIP10: ToAccountId;
export declare const fromCAIP10: FromAccountId;
export {};
