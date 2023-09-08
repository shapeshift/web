"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const toLower_1 = __importDefault(require("lodash/toLower"));
const assetId_1 = require("../../assetId/assetId");
const constants_1 = require("../../constants");
const _1 = require(".");
describe('adapters:yearn', () => {
    describe('yearnToAssetId', () => {
        it('can get AssetId id for yvUSDC 0.3.0', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetNamespace = 'erc20';
            const checksumAddress = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9';
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace,
                assetReference: (0, toLower_1.default)(checksumAddress),
            });
            expect((0, _1.yearnToAssetId)(checksumAddress)).toEqual(assetId);
        });
    });
    describe('AssetIdToYearn', () => {
        it('can get coincap id for yvUSDC 0.3.0', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetNamespace = 'erc20';
            const checksumAddress = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9';
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace,
                assetReference: (0, toLower_1.default)(checksumAddress),
            });
            expect((0, _1.assetIdToYearn)(assetId)).toEqual(checksumAddress);
        });
    });
});
