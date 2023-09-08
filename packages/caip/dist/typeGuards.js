"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertValidChainPartsPair = exports.assertIsAssetReference = exports.assertIsAssetNamespace = exports.assertIsChainReference = exports.assertIsChainNamespace = exports.assertIsChainId = exports.isChainIdParts = exports.isChainId = exports.isAssetIdParts = exports.isAssetId = exports.isAssetReference = exports.isAssetNamespace = exports.isChainReference = exports.isChainNamespace = void 0;
const chainId_1 = require("./chainId/chainId");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const isChainNamespace = (maybeChainNamespace) => Object.values(constants_1.CHAIN_NAMESPACE).includes(maybeChainNamespace);
exports.isChainNamespace = isChainNamespace;
const isChainReference = (maybeChainReference) => Object.values(constants_1.CHAIN_REFERENCE).includes(maybeChainReference);
exports.isChainReference = isChainReference;
const isAssetNamespace = (maybeAssetNamespace) => Object.values(constants_1.ASSET_NAMESPACE).includes(maybeAssetNamespace);
exports.isAssetNamespace = isAssetNamespace;
const isAssetReference = (maybeAssetReference) => Object.values(constants_1.ASSET_REFERENCE).includes(maybeAssetReference);
exports.isAssetReference = isAssetReference;
// NOTE: perf critical - benchmark any changes
const isAssetId = (maybeAssetId) => {
    const slashIdx = maybeAssetId.indexOf('/');
    const chainId = maybeAssetId.substring(0, slashIdx);
    const assetParts = maybeAssetId.substring(slashIdx + 1);
    const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(chainId);
    const idx = assetParts.indexOf(':');
    const assetNamespace = assetParts.substring(0, idx);
    return (0, exports.isAssetIdParts)(chainNamespace, chainReference, assetNamespace);
};
exports.isAssetId = isAssetId;
// NOTE: perf critical - benchmark any changes
const isAssetIdParts = (maybeChainNamespace, maybeChainReference, maybeAssetNamespace) => {
    return (!!constants_1.VALID_CHAIN_IDS[maybeChainNamespace]?.includes(maybeChainReference) && (0, exports.isAssetNamespace)(maybeAssetNamespace));
};
exports.isAssetIdParts = isAssetIdParts;
// NOTE: perf critical - benchmark any changes
const isChainId = (maybeChainId) => {
    const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(maybeChainId);
    return !!constants_1.VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference);
};
exports.isChainId = isChainId;
const isChainIdParts = (chainNamespace, chainReference) => {
    return !!constants_1.VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference);
};
exports.isChainIdParts = isChainIdParts;
const getTypeGuardAssertion = (typeGuard, message) => {
    return (value) => {
        if ((value && !typeGuard(value)) || !value)
            throw new Error(`${message}: ${value}`);
    };
};
exports.assertIsChainId = getTypeGuardAssertion(exports.isChainId, 'assertIsChainId: unsupported ChainId');
exports.assertIsChainNamespace = getTypeGuardAssertion(exports.isChainNamespace, 'assertIsChainNamespace: unsupported ChainNamespace');
exports.assertIsChainReference = getTypeGuardAssertion(exports.isChainReference, 'assertIsChainReference: unsupported ChainReference');
exports.assertIsAssetNamespace = getTypeGuardAssertion(exports.isAssetNamespace, 'assertIsAssetNamespace: unsupported AssetNamespace');
exports.assertIsAssetReference = getTypeGuardAssertion(exports.isAssetReference, 'assertIsAssetReference: unsupported AssetReference');
const assertValidChainPartsPair = (chainNamespace, chainReference) => {
    if (!(0, utils_1.isValidChainPartsPair)(chainNamespace, chainReference))
        throw new Error(`toAssetId: Chain Reference ${chainReference} not supported for Chain Namespace ${chainNamespace}`);
};
exports.assertValidChainPartsPair = assertValidChainPartsPair;
