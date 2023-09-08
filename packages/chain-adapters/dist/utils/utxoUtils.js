"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertXpubVersion = exports.scriptTypeToAccountType = exports.accountTypeToOutputScriptType = exports.accountTypeToScriptType = exports.utxoAccountParams = exports.toBtcOutputScriptType = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const hdwallet_core_1 = require("@shapeshiftoss/hdwallet-core");
const types_1 = require("@shapeshiftoss/types");
const bs58check_1 = require("bs58check");
/**
 * Utility function to convert a BTCInputScriptType to the corresponding BTCOutputScriptType
 * @param x a BTCInputScriptType
 * @returns the corresponding BTCOutputScriptType
 */
const toBtcOutputScriptType = (x) => {
    switch (x) {
        case hdwallet_core_1.BTCInputScriptType.SpendWitness:
            return hdwallet_core_1.BTCOutputScriptType.PayToWitness;
        case hdwallet_core_1.BTCInputScriptType.SpendP2SHWitness:
            return hdwallet_core_1.BTCOutputScriptType.PayToP2SHWitness;
        case hdwallet_core_1.BTCInputScriptType.SpendMultisig:
            return hdwallet_core_1.BTCOutputScriptType.PayToMultisig;
        case hdwallet_core_1.BTCInputScriptType.SpendAddress:
            return hdwallet_core_1.BTCOutputScriptType.PayToAddress;
        default:
            throw new TypeError('scriptType');
    }
};
exports.toBtcOutputScriptType = toBtcOutputScriptType;
/**
 * Utility function to get BIP44Params and scriptType
 */
const utxoAccountParams = (chainId, accountType, accountNumber) => {
    // TODO: dynamic coinType assignment to reduce copy/pasta
    switch (chainId) {
        case caip_1.dogeChainId:
            return {
                scriptType: hdwallet_core_1.BTCInputScriptType.SpendAddress,
                bip44Params: {
                    purpose: 44,
                    coinType: Number(caip_1.ASSET_REFERENCE.Dogecoin),
                    accountNumber,
                },
            };
        case caip_1.btcChainId:
            switch (accountType) {
                case types_1.UtxoAccountType.SegwitNative:
                    return {
                        scriptType: hdwallet_core_1.BTCInputScriptType.SpendWitness,
                        bip44Params: {
                            purpose: 84,
                            coinType: Number(caip_1.ASSET_REFERENCE.Bitcoin),
                            accountNumber,
                        },
                    };
                case types_1.UtxoAccountType.SegwitP2sh:
                    return {
                        scriptType: hdwallet_core_1.BTCInputScriptType.SpendP2SHWitness,
                        bip44Params: {
                            purpose: 49,
                            coinType: Number(caip_1.ASSET_REFERENCE.Bitcoin),
                            accountNumber,
                        },
                    };
                case types_1.UtxoAccountType.P2pkh:
                    return {
                        scriptType: hdwallet_core_1.BTCInputScriptType.SpendAddress,
                        bip44Params: {
                            purpose: 44,
                            coinType: Number(caip_1.ASSET_REFERENCE.Bitcoin),
                            accountNumber,
                        },
                    };
                default:
                    throw new TypeError('utxoAccountType');
            }
        case caip_1.bchChainId:
            return {
                scriptType: hdwallet_core_1.BTCInputScriptType.SpendAddress,
                bip44Params: {
                    purpose: 44,
                    coinType: Number(caip_1.ASSET_REFERENCE.BitcoinCash),
                    accountNumber,
                },
            };
        case caip_1.ltcChainId:
            switch (accountType) {
                case types_1.UtxoAccountType.SegwitNative:
                    return {
                        scriptType: hdwallet_core_1.BTCInputScriptType.SpendWitness,
                        bip44Params: {
                            purpose: 84,
                            coinType: Number(caip_1.ASSET_REFERENCE.Litecoin),
                            accountNumber,
                        },
                    };
                case types_1.UtxoAccountType.SegwitP2sh:
                    return {
                        scriptType: hdwallet_core_1.BTCInputScriptType.SpendP2SHWitness,
                        bip44Params: {
                            purpose: 49,
                            coinType: Number(caip_1.ASSET_REFERENCE.Litecoin),
                            accountNumber,
                        },
                    };
                case types_1.UtxoAccountType.P2pkh:
                    return {
                        scriptType: hdwallet_core_1.BTCInputScriptType.SpendAddress,
                        bip44Params: {
                            purpose: 44,
                            coinType: Number(caip_1.ASSET_REFERENCE.Litecoin),
                            accountNumber,
                        },
                    };
                default:
                    throw new TypeError('utxoAccountType');
            }
        default:
            throw new TypeError(`not a supported utxo chain ${chainId}`);
    }
};
exports.utxoAccountParams = utxoAccountParams;
exports.accountTypeToScriptType = Object.freeze({
    [types_1.UtxoAccountType.P2pkh]: hdwallet_core_1.BTCInputScriptType.SpendAddress,
    [types_1.UtxoAccountType.SegwitP2sh]: hdwallet_core_1.BTCInputScriptType.SpendP2SHWitness,
    [types_1.UtxoAccountType.SegwitNative]: hdwallet_core_1.BTCInputScriptType.SpendWitness,
});
exports.accountTypeToOutputScriptType = Object.freeze({
    [types_1.UtxoAccountType.P2pkh]: hdwallet_core_1.BTCOutputScriptType.PayToAddress,
    [types_1.UtxoAccountType.SegwitP2sh]: hdwallet_core_1.BTCOutputScriptType.PayToP2SHWitness,
    [types_1.UtxoAccountType.SegwitNative]: hdwallet_core_1.BTCOutputScriptType.PayToWitness,
});
exports.scriptTypeToAccountType = Object.freeze({
    [hdwallet_core_1.BTCInputScriptType.SpendAddress]: types_1.UtxoAccountType.P2pkh,
    [hdwallet_core_1.BTCInputScriptType.SpendP2SHWitness]: types_1.UtxoAccountType.SegwitP2sh,
    [hdwallet_core_1.BTCInputScriptType.SpendWitness]: types_1.UtxoAccountType.SegwitNative,
    [hdwallet_core_1.BTCInputScriptType.SpendMultisig]: undefined,
    [hdwallet_core_1.BTCInputScriptType.Bech32]: undefined,
    [hdwallet_core_1.BTCInputScriptType.CashAddr]: undefined,
    [hdwallet_core_1.BTCInputScriptType.External]: undefined,
});
/*
 * @see https://github.com/blockkeeper/blockkeeper-frontend-web/issues/38
 *
 * ypub and zpub are defined by BIP48 and BIP84 as special version bytes for use in the BIP44
 * encoding of the keys for their respective account types. Defining custom serialization formats
 * for different account types has since fallen out of favor (as in BIP86) but getting these bytes
 * correct is relevant for interoperation with a variety of other software (like Blockbook).
 *
 * The only difference compared to xpub is a prefix, but as it is a base58 encoded string with a
 * checksum, the checksum is also different.
 *
 * The easiest way to fix it is to decode from base58check, replace the prefix to
 * standard xpub or ypub and then to encode back to base58check. Then one can use this xpub
 * as normal bip44 master key.
 *
 * It may make sense to remember the type of the public key as it tells what type of script
 * is used in the wallet.
 *
 */
var PublicKeyType;
(function (PublicKeyType) {
    PublicKeyType["xpub"] = "0488b21e";
    PublicKeyType["ypub"] = "049d7cb2";
    PublicKeyType["zpub"] = "04b24746";
    PublicKeyType["dgub"] = "02facafd";
    PublicKeyType["Ltub"] = "019da462";
    PublicKeyType["Mtub"] = "01b26ef6";
})(PublicKeyType || (PublicKeyType = {}));
const accountTypeToVersion = {
    [types_1.UtxoAccountType.P2pkh]: Buffer.from(PublicKeyType.xpub, 'hex'),
    [types_1.UtxoAccountType.SegwitP2sh]: Buffer.from(PublicKeyType.ypub, 'hex'),
    [types_1.UtxoAccountType.SegwitNative]: Buffer.from(PublicKeyType.zpub, 'hex'),
};
const convertVersions = ['xpub', 'ypub', 'zpub'];
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
function convertXpubVersion(xpub, accountType) {
    if (!convertVersions.includes(xpub.substring(0, 4))) {
        return xpub;
    }
    const payload = (0, bs58check_1.decode)(xpub);
    const version = payload.slice(0, 4);
    if (version.compare(accountTypeToVersion[accountType]) !== 0) {
        // Get the key without the version code at the front
        const key = payload.slice(4);
        return (0, bs58check_1.encode)(Buffer.concat([accountTypeToVersion[accountType], key]));
    }
    return xpub;
}
exports.convertXpubVersion = convertXpubVersion;
