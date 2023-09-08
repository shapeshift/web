import type { AssetId, ChainId } from '@shapeshiftoss/caip';
import type { ParsedTx, Tx } from './types';
export * from './types';
export interface BaseTransactionParserArgs {
    chainId: ChainId;
    assetId: AssetId;
}
export declare class BaseTransactionParser<T extends Tx> {
    chainId: ChainId;
    assetId: AssetId;
    constructor(args: BaseTransactionParserArgs);
    parse(tx: T, address: string): Promise<ParsedTx>;
    private getStatus;
}
