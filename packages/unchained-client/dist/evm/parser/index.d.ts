import type { AssetId, ChainId } from '@shapeshiftoss/caip';
import { ethers } from 'ethers';
import type { Api } from '..';
import type { ParsedTx, SubParser, Tx } from './types';
export * from './types';
export * from './utils';
export interface TransactionParserArgs {
    chainId: ChainId;
    assetId: AssetId;
    api: Api;
    rpcUrl: string;
}
export declare class BaseTransactionParser<T extends Tx> {
    chainId: ChainId;
    assetId: AssetId;
    protected readonly api: Api;
    protected readonly provider: ethers.providers.JsonRpcBatchProvider;
    private parsers;
    constructor(args: TransactionParserArgs);
    /**
     * Register custom transaction sub parser to extract contract specific data
     *
     * _parsers should be registered from most generic first to most specific last_
     */
    registerParser(parser: SubParser<T>): void;
    protected registerParsers(parsers: SubParser<T>[]): void;
    parse(tx: T, address: string): Promise<ParsedTx>;
    private getStatus;
    private getParsedTxWithTransfers;
}
