import type { Token, Transfer, TransferType } from './types';
export declare function findAsyncSequential<T, U>(array: T[], predicate: (element: T) => Promise<U | undefined>): Promise<U | undefined>;
export interface AggregateTransferArgs {
    assetId: string;
    from: string;
    id?: string;
    to: string;
    token?: Token;
    transfers: Transfer[];
    type: TransferType;
    value: string;
}
export declare function aggregateTransfer(args: AggregateTransferArgs): Transfer[];
