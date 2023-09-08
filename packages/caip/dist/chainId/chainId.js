"use strict";
// https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromCAIP2 = exports.toCAIP2 = exports.fromChainId = exports.toChainId = void 0;
const typeGuards_1 = require("../typeGuards");
const toChainId = (args) => {
    const { chainNamespace, chainReference } = args;
    const maybeChainId = `${chainNamespace}:${chainReference}`;
    (0, typeGuards_1.assertIsChainId)(maybeChainId);
    return maybeChainId;
};
exports.toChainId = toChainId;
// NOTE: perf critical - benchmark any changes
const fromChainId = (chainId) => {
    const idx = chainId.indexOf(':');
    const chainNamespace = chainId.substring(0, idx);
    const chainReference = chainId.substring(idx + 1);
    return {
        chainNamespace: chainNamespace,
        chainReference: chainReference,
    };
};
exports.fromChainId = fromChainId;
exports.toCAIP2 = exports.toChainId;
exports.fromCAIP2 = exports.fromChainId;
