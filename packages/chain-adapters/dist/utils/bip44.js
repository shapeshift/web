"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromAddressNList = exports.toAddressNList = exports.fromPath = exports.toPath = exports.toRootDerivationPath = void 0;
const hdwallet_core_1 = require("@shapeshiftoss/hdwallet-core");
const toRootDerivationPath = (bip44Params) => {
    const { purpose, coinType, accountNumber } = bip44Params;
    if (typeof purpose === 'undefined')
        throw new Error('toPath: bip44Params.purpose is required');
    if (typeof coinType === 'undefined')
        throw new Error('toPath: bip44Params.coinType is required');
    if (typeof accountNumber === 'undefined')
        throw new Error('toPath: bip44Params.accountNumber is required');
    return `m/${purpose}'/${coinType}'/${accountNumber}'`;
};
exports.toRootDerivationPath = toRootDerivationPath;
const toPath = (bip44Params) => {
    const { purpose, coinType, accountNumber, isChange = false, index = 0 } = bip44Params;
    if (typeof purpose === 'undefined')
        throw new Error('toPath: bip44Params.purpose is required');
    if (typeof coinType === 'undefined')
        throw new Error('toPath: bip44Params.coinType is required');
    if (typeof accountNumber === 'undefined')
        throw new Error('toPath: bip44Params.accountNumber is required');
    return `m/${purpose}'/${coinType}'/${accountNumber}'/${Number(isChange)}/${index}`;
};
exports.toPath = toPath;
const fromPath = (path) => {
    const parts = path.split('/');
    const sliced = parts.slice(1); // discard the m/
    if (sliced.length !== 5)
        throw new Error(`fromPath: path only has ${sliced.length} parts`);
    const partsWithoutPrimes = sliced.map(part => part.replace("'", '')); // discard harderning
    const [purpose, coinType, accountNumber, isChangeNumber, index] = partsWithoutPrimes.map(Number);
    const isChange = Boolean(isChangeNumber);
    return { purpose, coinType, accountNumber, isChange, index };
};
exports.fromPath = fromPath;
const toAddressNList = (bip44Params) => {
    return (0, hdwallet_core_1.bip32ToAddressNList)((0, exports.toPath)(bip44Params));
};
exports.toAddressNList = toAddressNList;
const fromAddressNList = (addressNList) => {
    return (0, exports.fromPath)((0, hdwallet_core_1.addressNListToBIP32)(addressNList));
};
exports.fromAddressNList = fromAddressNList;
