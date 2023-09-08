"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromCAIP10 = exports.toCAIP10 = exports.fromAccountId = exports.toAccountId = void 0;
const chainId_1 = require("../chainId/chainId");
const constants_1 = require("../constants");
const typeGuards_1 = require("../typeGuards");
const toAccountId = ({ chainId: maybeChainId, chainNamespace: maybeChainNamespace, chainReference: maybeChainReference, account, }) => {
    if (!account)
        throw new Error(`toAccountId: account is required`);
    const chainId = maybeChainId ??
        (0, chainId_1.toChainId)({ chainNamespace: maybeChainNamespace, chainReference: maybeChainReference });
    (0, typeGuards_1.assertIsChainId)(chainId);
    const { chainNamespace } = (0, chainId_1.fromChainId)(chainId);
    // we lowercase eth accounts as per the draft spec
    // it's not explicit, but cHecKsUM can be recovered from lowercase eth accounts
    // we don't lowercase bitcoin addresses as they'll fail checksum
    const outputAccount = chainNamespace === constants_1.CHAIN_NAMESPACE.Evm ? account.toLowerCase() : account;
    return `${chainId}:${outputAccount}`;
};
exports.toAccountId = toAccountId;
const fromAccountId = accountId => {
    const parts = accountId.split(':');
    if (parts.length !== 3) {
        throw new Error(`fromAccountId: invalid AccountId ${accountId}`);
    }
    const chainNamespace = parts[0];
    const chainReference = parts[1];
    const chainId = parts.slice(0, 2).join(':');
    (0, typeGuards_1.assertIsChainNamespace)(chainNamespace);
    (0, typeGuards_1.assertIsChainReference)(chainReference);
    (0, typeGuards_1.assertIsChainId)(chainId);
    const account = parts[2];
    if (!account) {
        throw new Error(`fromAccountId: account required`);
    }
    // we lowercase eth accounts as per the draft spec
    // it's not explicit, but cHecKsUM can be recovered from lowercase eth accounts
    // we don't lowercase bitcoin addresses as they'll fail checksum
    const outputAccount = chainNamespace === constants_1.CHAIN_NAMESPACE.Evm ? account.toLowerCase() : account;
    return { chainId, account: outputAccount, chainNamespace, chainReference };
};
exports.fromAccountId = fromAccountId;
exports.toCAIP10 = exports.toAccountId;
exports.fromCAIP10 = exports.fromAccountId;
