"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.utxoSelect = void 0;
const coinselect_1 = __importDefault(require("coinselect"));
const split_1 = __importDefault(require("coinselect/split"));
/**
 * Returns necessary utxo inputs & outputs for a desired tx at a given fee with OP_RETURN data considered if provided
 *
 * _opReturnData is filtered out of the return payload as it is added during transaction signing_
 */
const utxoSelect = (input) => {
    const utxos = input.utxos.reduce((acc, utxo) => {
        const sanitizedUtxo = { ...utxo, value: Number(utxo.value) };
        // If input contains a `from` param, the intent is to only keep the UTXOs from that address
        // so we can ensure the send address is the one we want
        // This doesn't do any further checks, so error-handling should be done by the caller e.g `buildSendTransaction` callsites
        if (!input.from || (input.from && utxo.address === input.from)) {
            acc.push(sanitizedUtxo);
        }
        return acc;
    }, []);
    const extraOutput = input.opReturnData ? [{ value: 0, script: input.opReturnData }] : [];
    const result = (() => {
        if (input.sendMax) {
            const outputs = [{ address: input.to }, ...extraOutput];
            return (0, split_1.default)(utxos, outputs, Number(input.satoshiPerByte));
        }
        const outputs = [{ value: Number(input.value), address: input.to }, ...extraOutput];
        return (0, coinselect_1.default)(utxos, outputs, Number(input.satoshiPerByte));
    })();
    /**
     * note - the 0-indexed output is the `to` address, and if `input.from` is included as an argument, the
     * 1-indexed output will be the change address, which we overwrite below
     */
    if (input.from && result?.outputs?.[1]?.value) {
        // If input contains a `from` param, inputs will be filtered to only keep UTXOs from that address
        // The change address will be set to this from address, so that it can be reused
        // Reusing addresses is an xpub antipattern and totally voids UTXO privacy guarantees, thus input.from should only be used
        // when dealing with destinations that expect address reuse e.g THORChain savers
        const { value } = result.outputs[1];
        result.outputs[1] = { address: input.from, value };
    }
    return { ...result, outputs: result.outputs?.filter(o => !o.script) };
};
exports.utxoSelect = utxoSelect;
