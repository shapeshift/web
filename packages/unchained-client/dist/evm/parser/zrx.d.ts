import type { BaseTxMetadata } from '../../types';
import type { SubParser, TxSpecific } from '.';
import type { Tx } from './types';
export interface TxMetadata extends BaseTxMetadata {
    parser: 'zrx';
}
export interface ParserArgs {
    proxyContract: string;
}
export declare class Parser implements SubParser<Tx> {
    private readonly proxyContract;
    constructor(args: ParserArgs);
    parse(tx: Tx): Promise<TxSpecific | undefined>;
}
