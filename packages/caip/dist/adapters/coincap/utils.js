"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseData = exports.parseEthData = exports.fetchData = exports.writeFiles = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const assetId_1 = require("../../assetId/assetId");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const writeFiles = async (data) => {
    const path = './src/adapters/coincap/generated/';
    const file = '/adapter.json';
    const writeFile = async ([k, v]) => await fs_1.default.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v));
    await Promise.all(Object.entries(data).map(writeFile));
    console.info('Generated CoinCap AssetId adapter data.');
};
exports.writeFiles = writeFiles;
const fetchData = async (URL) => (await axios_1.default.get(URL)).data.data;
exports.fetchData = fetchData;
const parseEthData = (data) => {
    const ethCoins = data.filter(({ id, explorer }) => (explorer && explorer.startsWith('https://etherscan.io/token/0x')) || id === 'ethereum');
    return ethCoins.reduce((acc, { id, explorer }) => {
        const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
        const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
        let assetReference = constants_1.ASSET_REFERENCE.Ethereum;
        const assetNamespace = id === 'ethereum' ? 'slip44' : 'erc20';
        if (id !== 'ethereum' && explorer) {
            assetReference = explorer
                .replace('https://etherscan.io/token/', '')
                .split('#')[0]
                .split('?')[0];
        }
        const assetId = (0, assetId_1.toAssetId)({ chainNamespace, chainReference, assetNamespace, assetReference });
        acc[assetId] = id;
        return acc;
    }, {});
};
exports.parseEthData = parseEthData;
const parseData = (d) => ({
    [constants_1.ethChainId]: (0, exports.parseEthData)(d),
    [constants_1.btcChainId]: utils_1.bitcoinAssetMap,
    [constants_1.bchChainId]: utils_1.bitcoinCashAssetMap,
    [constants_1.dogeChainId]: utils_1.dogecoinAssetMap,
    [constants_1.ltcChainId]: utils_1.litecoinAssetMap,
    [constants_1.cosmosChainId]: utils_1.cosmosAssetMap,
    [constants_1.thorchainChainId]: utils_1.thorchainAssetMap,
});
exports.parseData = parseData;
