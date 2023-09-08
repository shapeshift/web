declare const _default: {
    tx: {
        txid: string;
        blockHash: string;
        blockHeight: number;
        timestamp: number;
        status: number;
        from: string;
        to: string;
        confirmations: number;
        value: string;
        fee: string;
        gasLimit: string;
        gasUsed: string;
        gasPrice: string;
        inputData: string;
        tokenTransfers: {
            contract: string;
            decimals: number;
            name: string;
            symbol: string;
            type: string;
            from: string;
            to: string;
            value: string;
        }[];
    };
};
export default _default;
