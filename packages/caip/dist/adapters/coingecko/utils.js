"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFiles = exports.parseData = exports.fetchData = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const assetId_1 = require("../../assetId/assetId");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const _1 = require(".");
const fetchData = async (URL) => (await axios_1.default.get(URL)).data;
exports.fetchData = fetchData;
const parseData = (coins) => {
    const assetMap = coins.reduce((prev, { id, platforms }) => {
        if (Object.keys(platforms).includes(_1.CoingeckoAssetPlatform.Ethereum)) {
            try {
                const assetId = (0, assetId_1.toAssetId)({
                    chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                    chainReference: constants_1.CHAIN_REFERENCE.EthereumMainnet,
                    assetNamespace: 'erc20',
                    assetReference: platforms[_1.CoingeckoAssetPlatform.Ethereum],
                });
                prev[constants_1.ethChainId][assetId] = id;
            }
            catch {
                // unable to create assetId, skip token
            }
        }
        if (Object.keys(platforms).includes(_1.CoingeckoAssetPlatform.Avalanche)) {
            try {
                const assetId = (0, assetId_1.toAssetId)({
                    chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                    chainReference: constants_1.CHAIN_REFERENCE.AvalancheCChain,
                    assetNamespace: 'erc20',
                    assetReference: platforms[_1.CoingeckoAssetPlatform.Avalanche],
                });
                prev[constants_1.avalancheChainId][assetId] = id;
            }
            catch {
                // unable to create assetId, skip token
            }
        }
        if (Object.keys(platforms).includes(_1.CoingeckoAssetPlatform.Optimism)) {
            try {
                const assetId = (0, assetId_1.toAssetId)({
                    chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                    chainReference: constants_1.CHAIN_REFERENCE.OptimismMainnet,
                    assetNamespace: 'erc20',
                    assetReference: platforms[_1.CoingeckoAssetPlatform.Optimism],
                });
                prev[constants_1.optimismChainId][assetId] = id;
            }
            catch {
                // unable to create assetId, skip token
            }
        }
        if (Object.keys(platforms).includes(_1.CoingeckoAssetPlatform.BnbSmartChain)) {
            try {
                const assetId = (0, assetId_1.toAssetId)({
                    chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                    chainReference: constants_1.CHAIN_REFERENCE.BnbSmartChainMainnet,
                    assetNamespace: 'bep20',
                    assetReference: platforms[_1.CoingeckoAssetPlatform.BnbSmartChain],
                });
                prev[constants_1.bscChainId][assetId] = id;
            }
            catch {
                // unable to create assetId, skip token
            }
        }
        if (Object.keys(platforms).includes(_1.CoingeckoAssetPlatform.Polygon)) {
            try {
                const assetId = (0, assetId_1.toAssetId)({
                    chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                    chainReference: constants_1.CHAIN_REFERENCE.PolygonMainnet,
                    assetNamespace: 'erc20',
                    assetReference: platforms[_1.CoingeckoAssetPlatform.Polygon],
                });
                prev[constants_1.polygonChainId][assetId] = id;
            }
            catch (err) {
                // unable to create assetId, skip token
            }
        }
        if (Object.keys(platforms).includes(_1.CoingeckoAssetPlatform.Gnosis)) {
            try {
                const assetId = (0, assetId_1.toAssetId)({
                    chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                    chainReference: constants_1.CHAIN_REFERENCE.GnosisMainnet,
                    assetNamespace: 'erc20',
                    assetReference: platforms[_1.CoingeckoAssetPlatform.Gnosis],
                });
                prev[constants_1.gnosisChainId][assetId] = id;
            }
            catch (err) {
                // unable to create assetId, skip token
            }
        }
        return prev;
    }, {
        [constants_1.ethChainId]: { [constants_1.ethAssetId]: 'ethereum' },
        [constants_1.avalancheChainId]: { [constants_1.avalancheAssetId]: 'avalanche-2' },
        [constants_1.optimismChainId]: { [constants_1.optimismAssetId]: 'ethereum' },
        [constants_1.bscChainId]: { [constants_1.bscAssetId]: 'binancecoin' },
        [constants_1.polygonChainId]: { [constants_1.polygonAssetId]: 'matic-network' },
        [constants_1.gnosisChainId]: { [constants_1.gnosisAssetId]: 'xdai' },
    });
    return {
        ...assetMap,
        [constants_1.btcChainId]: utils_1.bitcoinAssetMap,
        [constants_1.bchChainId]: utils_1.bitcoinCashAssetMap,
        [constants_1.dogeChainId]: utils_1.dogecoinAssetMap,
        [constants_1.ltcChainId]: utils_1.litecoinAssetMap,
        [constants_1.cosmosChainId]: utils_1.cosmosAssetMap,
        [constants_1.thorchainChainId]: utils_1.thorchainAssetMap,
    };
};
exports.parseData = parseData;
const writeFiles = async (data) => {
    await Promise.all(Object.entries(data).map(async ([chainId, assets]) => {
        const dirPath = `./src/adapters/coingecko/generated/${chainId}`.replace(':', '_');
        await fs_1.default.promises.writeFile(`${dirPath}/adapter.json`, JSON.stringify(assets));
    }));
    console.info('Generated CoinGecko AssetId adapter data.');
};
exports.writeFiles = writeFiles;
