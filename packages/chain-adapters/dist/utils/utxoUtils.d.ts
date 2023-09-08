import type { ChainId } from '@shapeshiftoss/caip';
import { BTCInputScriptType, BTCOutputScriptType } from '@shapeshiftoss/hdwallet-core';
import type { BIP44Params } from '@shapeshiftoss/types';
import { UtxoAccountType } from '@shapeshiftoss/types';
/**
 * Utility function to convert a BTCInputScriptType to the corresponding BTCOutputScriptType
 * @param x a BTCInputScriptType
 * @returns the corresponding BTCOutputScriptType
 */
export declare const toBtcOutputScriptType: (x: BTCInputScriptType) => BTCOutputScriptType.PayToAddress | BTCOutputScriptType.PayToMultisig | BTCOutputScriptType.PayToWitness | BTCOutputScriptType.PayToP2SHWitness;
/**
 * Utility function to get BIP44Params and scriptType
 */
export declare const utxoAccountParams: (chainId: ChainId, accountType: UtxoAccountType, accountNumber: number) => {
    bip44Params: BIP44Params;
    scriptType: BTCInputScriptType;
};
export declare const accountTypeToScriptType: Record<UtxoAccountType, BTCInputScriptType>;
export declare const accountTypeToOutputScriptType: Record<UtxoAccountType, BTCOutputScriptType>;
export declare const scriptTypeToAccountType: Record<BTCInputScriptType, UtxoAccountType | undefined>;
/**
 * Convert any public key into an xpub, ypub, or zpub based on account type
 *
 * Blockbook generates addresses from a public key based on the version bytes
 * some wallets always return the public key in "xpub" format, so we need to convert those
 *
 * USE SPARINGLY - there aren't many cases where we should convert version bytes
 * @param {string} xpub - the public key provided by the wallet
 * @param {UtxoAccountType} accountType - The desired account type to be encoded into the public key
 */
export declare function convertXpubVersion(xpub: string, accountType: UtxoAccountType): string;
