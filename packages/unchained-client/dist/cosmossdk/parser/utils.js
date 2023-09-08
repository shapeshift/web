"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaData = exports.getAssetIdByDenom = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const assetIdByDenom = new Map([
    ['uatom', caip_1.cosmosAssetId],
    ['rune', caip_1.thorchainAssetId],
]);
const getAssetIdByDenom = (denom, assetId) => {
    if (assetIdByDenom.has(denom))
        return assetIdByDenom.get(denom);
    const { chainId } = (0, caip_1.fromAssetId)(assetId);
    const [assetNamespace, assetReference] = denom.split('/');
    if (assetNamespace === 'ibc' && assetReference) {
        return (0, caip_1.toAssetId)({ chainId, assetNamespace, assetReference });
    }
    console.warn(`unknown denom: ${denom}`);
    return;
};
exports.getAssetIdByDenom = getAssetIdByDenom;
const metaData = (msg, event, assetId) => {
    switch (msg.type) {
        case 'delegate':
            return {
                parser: 'staking',
                method: msg.type,
                value: msg.value.amount,
                assetId: (0, exports.getAssetIdByDenom)(msg.value.denom, assetId) ?? '',
                delegator: msg.origin,
                destinationValidator: msg.to,
            };
        case 'begin_unbonding':
            return {
                parser: 'staking',
                method: msg.type,
                value: msg.value.amount,
                assetId: (0, exports.getAssetIdByDenom)(msg.value.denom, assetId) ?? '',
                delegator: msg.origin,
                destinationValidator: msg.from,
            };
        case 'begin_redelegate':
            return {
                parser: 'staking',
                method: msg.type,
                value: msg.value.amount,
                assetId: (0, exports.getAssetIdByDenom)(msg.value.denom, assetId) ?? '',
                delegator: msg.origin,
                sourceValidator: msg.from,
                destinationValidator: msg.to,
            };
        case 'withdraw_delegator_reward':
            return {
                parser: 'staking',
                method: msg.type,
                value: msg.value.amount,
                assetId: (0, exports.getAssetIdByDenom)(msg.value.denom, assetId) ?? '',
                delegator: msg.origin,
                destinationValidator: msg.to,
            };
        case 'transfer':
            return {
                parser: 'ibc',
                method: msg.type,
                value: msg.value.amount,
                assetId: (0, exports.getAssetIdByDenom)(msg.value.denom, assetId) ?? '',
                ibcSource: msg.origin,
                ibcDestination: msg.to,
                sequence: event['send_packet']['packet_sequence'],
            };
        case 'recv_packet':
            return {
                parser: 'ibc',
                method: msg.type,
                value: msg.value.amount,
                assetId: (0, exports.getAssetIdByDenom)(msg.value.denom, assetId) ?? '',
                ibcSource: msg.origin,
                ibcDestination: msg.to,
                sequence: event['recv_packet']['packet_sequence'],
            };
        case 'deposit':
            if (event['add_liquidity']) {
                return {
                    parser: 'lp',
                    method: msg.type,
                    pool: event['add_liquidity']['pool'],
                };
            }
            return {
                parser: 'swap',
                method: msg.type,
                memo: event['message']['memo'],
            };
        case 'outbound': {
            const memo = event['outbound']['memo'];
            const [type] = memo.split(':');
            return {
                parser: 'swap',
                method: type.toLowerCase() || msg.type,
                memo: event['outbound']['memo'],
            };
        }
        case 'send':
            // known message types with no applicable metadata
            return;
        default:
            console.warn(`unsupported message type: ${msg.type}`);
            return;
    }
};
exports.metaData = metaData;
