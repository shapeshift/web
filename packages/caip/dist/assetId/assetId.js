"use strict";
// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromCAIP19 = exports.toCAIP19 = exports.deserializeNftAssetReference = exports.isNft = exports.fromAssetId = exports.toAssetId = void 0;
const chainId_1 = require("../chainId/chainId");
const constants_1 = require("../constants");
const typeGuards_1 = require("../typeGuards");
/**
 * validate that a value is a string slip44 value
 * @see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 * @param {string} value - possible slip44 value
 */
const isValidSlip44 = (value) => {
    const n = Number(value);
    // slip44 has a max value of an unsigned 32-bit integer
    return !isNaN(n) && n >= 0 && n < 4294967296;
};
const isToAssetIdWithChainIdArgs = (args) => !!args.chainId;
const toAssetId = (args) => {
    const { assetNamespace, assetReference } = args;
    (0, typeGuards_1.assertIsAssetNamespace)(assetNamespace);
    if (!assetReference)
        throw new Error('toAssetId: No assetReference provided');
    const { chainId, chainNamespace, chainReference } = (() => {
        if (isToAssetIdWithChainIdArgs(args)) {
            const fromChainIdResult = (0, chainId_1.fromChainId)(args.chainId);
            return {
                chainId: args.chainId,
                chainNamespace: fromChainIdResult.chainNamespace,
                chainReference: fromChainIdResult.chainReference,
            };
        }
        else
            return {
                chainId: (0, chainId_1.toChainId)({
                    chainNamespace: args.chainNamespace,
                    chainReference: args.chainReference,
                }),
                chainNamespace: args.chainNamespace,
                chainReference: args.chainReference,
            };
    })();
    (0, typeGuards_1.assertIsChainNamespace)(chainNamespace);
    (0, typeGuards_1.assertIsChainReference)(chainReference);
    (0, typeGuards_1.assertValidChainPartsPair)(chainNamespace, chainReference);
    if (!constants_1.VALID_ASSET_NAMESPACE[chainNamespace].includes(assetNamespace) ||
        !(0, typeGuards_1.isAssetNamespace)(assetNamespace))
        throw new Error(`toAssetId: AssetNamespace ${assetNamespace} not supported for Chain Namespace ${chainNamespace}`);
    if (assetNamespace === 'slip44' && !isValidSlip44(String(assetReference))) {
        throw new Error(`Invalid reference for namespace slip44`);
    }
    const assetReferenceNormalized = (() => {
        const assertContractAddress = (address) => {
            if (!address.startsWith('0x'))
                throw new Error(`toAssetId: assetReference must start with 0x: ${assetReference}`);
            if (address.length !== 42)
                throw new Error(`toAssetId: assetReference length must be 42, length: ${assetReference.length}, ${assetReference}`);
        };
        switch (assetNamespace) {
            case 'erc20':
            case 'bep20':
                assertContractAddress(assetReference);
                return assetReference.toLowerCase();
            case 'erc721':
            case 'erc1155':
            case 'bep721':
            case 'bep1155':
                // caip-22 (https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-22.md)
                // caip-29 (https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-29.md)
                const [address] = assetReference.split('/');
                assertContractAddress(address);
                return assetReference.toLowerCase();
            default:
                return assetReference;
        }
    })();
    return `${chainId}/${assetNamespace}:${assetReferenceNormalized}`;
};
exports.toAssetId = toAssetId;
// NOTE: perf critical - benchmark any changes
const fromAssetId = (assetId) => {
    const slashIdx = assetId.indexOf('/');
    const chainId = assetId.substring(0, slashIdx);
    const assetParts = assetId.substring(slashIdx + 1);
    const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(chainId);
    const idx = assetParts.indexOf(':');
    const assetNamespace = assetParts.substring(0, idx);
    const assetReference = assetParts.substring(idx + 1);
    if (!(0, typeGuards_1.isAssetIdParts)(chainNamespace, chainReference, assetNamespace))
        throw new Error(`fromAssetId: invalid AssetId: ${assetId}`);
    const assetReferenceNormalized = (() => {
        switch (assetNamespace) {
            case 'erc20':
            case 'bep20':
            case 'erc721':
            case 'erc1155':
            case 'bep721':
            case 'bep1155':
                return assetReference.toLowerCase();
            default:
                return assetReference;
        }
    })();
    return {
        chainId,
        chainNamespace: chainNamespace,
        chainReference: chainReference,
        assetNamespace: assetNamespace,
        assetReference: assetReferenceNormalized,
    };
};
exports.fromAssetId = fromAssetId;
// NOTE: perf critical - benchmark any changes
const isNft = (assetId) => {
    const slashIdx = assetId.indexOf('/');
    const assetParts = assetId.substring(slashIdx + 1);
    const idx = assetParts.indexOf(':');
    const assetNamespace = assetParts.substring(0, idx);
    return ['erc721', 'erc1155', 'bep721', 'bep1155'].includes(assetNamespace);
};
exports.isNft = isNft;
const deserializeNftAssetReference = (assetReference) => {
    const [address, id] = assetReference.split('/');
    return [address, id];
};
exports.deserializeNftAssetReference = deserializeNftAssetReference;
exports.toCAIP19 = exports.toAssetId;
exports.fromCAIP19 = exports.fromAssetId;
