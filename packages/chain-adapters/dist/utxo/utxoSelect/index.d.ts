import type * as unchained from '@shapeshiftoss/unchained-client';
export type UTXOSelectInput = {
    utxos: unchained.bitcoin.Utxo[];
    from?: string;
    to: string;
    value: string;
    satoshiPerByte: string;
    opReturnData?: string;
    sendMax: boolean;
};
/**
 * Returns necessary utxo inputs & outputs for a desired tx at a given fee with OP_RETURN data considered if provided
 *
 * _opReturnData is filtered out of the return payload as it is added during transaction signing_
 */
export declare const utxoSelect: (input: UTXOSelectInput) => {
    outputs: Output[] | undefined;
    fee: number;
    inputs?: (Omit<unchained.utxo.bitcoin.Utxo, "value"> & {
        value: number;
    })[] | undefined;
};
