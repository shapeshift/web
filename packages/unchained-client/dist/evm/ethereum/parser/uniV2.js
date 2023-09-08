"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const ethers_1 = require("ethers");
const types_1 = require("../../../types");
const parser_1 = require("../../parser");
const erc20_1 = require("../../parser/abi/erc20");
const uniV2_1 = require("./abi/uniV2");
const uniV2StakingRewards_1 = require("./abi/uniV2StakingRewards");
const constants_1 = require("./constants");
class Parser {
    constructor(args) {
        this.abiInterface = new ethers_1.ethers.utils.Interface(uniV2_1.UNIV2_ABI);
        this.stakingRewardsInterface = new ethers_1.ethers.utils.Interface(uniV2StakingRewards_1.UNIV2_STAKING_REWARDS_ABI);
        this.supportedFunctions = {
            addLiquidityEthSigHash: this.abiInterface.getSighash('addLiquidityETH'),
            removeLiquidityEthSigHash: this.abiInterface.getSighash('removeLiquidityETH'),
        };
        this.supportedStakingRewardsFunctions = {
            stakeSigHash: this.stakingRewardsInterface.getSighash('stake'),
            exitSigHash: this.stakingRewardsInterface.getSighash('exit'),
        };
        this.chainId = args.chainId;
        this.provider = args.provider;
        this.wethContract = (() => {
            switch (args.chainId) {
                case 'eip155:1':
                    return constants_1.WETH_CONTRACT_MAINNET;
                case 'eip155:3':
                    return constants_1.WETH_CONTRACT_ROPSTEN;
                default:
                    throw new Error('chainId is not supported. (supported chainIds: eip155:1, eip155:3)');
            }
        })();
    }
    async parseUniV2(tx) {
        if (!tx.inputData)
            return;
        const txSigHash = (0, parser_1.getSigHash)(tx.inputData);
        if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash))
            return;
        const decoded = this.abiInterface.parseTransaction({ data: tx.inputData });
        // failed to decode input data
        if (!decoded)
            return;
        // Unconfirmed Txs are the edge case here, we augment them with transfers
        // For confirmed Tx, the metadata is all we actually need
        if (tx.confirmations)
            return {
                data: {
                    parser: 'uniV2',
                    method: decoded.name,
                },
            };
        const tokenAddress = ethers_1.ethers.utils.getAddress(decoded.args.token.toLowerCase());
        const lpTokenAddress = Parser.pairFor(tokenAddress, this.wethContract);
        const transfers = await (async () => {
            switch ((0, parser_1.getSigHash)(tx.inputData)) {
                case this.supportedFunctions.addLiquidityEthSigHash: {
                    const contract = new ethers_1.ethers.Contract(tokenAddress, erc20_1.ERC20_ABI, this.provider);
                    const decimals = await contract.decimals();
                    const name = await contract.name();
                    const symbol = await contract.symbol();
                    const value = decoded.args.amountTokenDesired.toString();
                    const assetId = (0, caip_1.toAssetId)({
                        ...(0, caip_1.fromChainId)(this.chainId),
                        assetNamespace: 'erc20',
                        assetReference: tokenAddress,
                    });
                    return [
                        {
                            type: types_1.TransferType.Send,
                            from: tx.from,
                            to: lpTokenAddress,
                            assetId,
                            totalValue: value,
                            components: [{ value }],
                            token: { contract: tokenAddress, decimals, name, symbol },
                        },
                    ];
                }
                case this.supportedFunctions.removeLiquidityEthSigHash: {
                    const contract = new ethers_1.ethers.Contract(lpTokenAddress, erc20_1.ERC20_ABI, this.provider);
                    const decimals = await contract.decimals();
                    const name = await contract.name();
                    const symbol = await contract.symbol();
                    const value = decoded.args.liquidity.toString();
                    const assetId = (0, caip_1.toAssetId)({
                        ...(0, caip_1.fromChainId)(this.chainId),
                        assetNamespace: 'erc20',
                        assetReference: lpTokenAddress,
                    });
                    return [
                        {
                            type: types_1.TransferType.Send,
                            from: tx.from,
                            to: lpTokenAddress,
                            assetId,
                            totalValue: value,
                            components: [{ value }],
                            token: { contract: lpTokenAddress, decimals, name, symbol },
                        },
                    ];
                }
                default:
                    return;
            }
        })();
        // no supported function detected
        if (!transfers)
            return;
        return {
            transfers,
            data: {
                parser: 'uniV2',
                method: decoded.name,
            },
        };
    }
    parseStakingRewards(tx) {
        if (!tx.inputData)
            return;
        const txSigHash = (0, parser_1.getSigHash)(tx.inputData);
        if (!Object.values(this.supportedStakingRewardsFunctions).some(hash => hash === txSigHash))
            return;
        const decoded = this.stakingRewardsInterface.parseTransaction({ data: tx.inputData });
        // failed to decode input data
        if (!decoded)
            return;
        return {
            data: {
                parser: 'uniV2',
                method: decoded.name,
            },
        };
    }
    async parse(tx) {
        if ((0, parser_1.txInteractsWithContract)(tx, constants_1.UNI_V2_ROUTER_CONTRACT))
            return await this.parseUniV2(tx);
        // TODO: parse any transaction that has input data that is able to be decoded using the `stakingRewardsInterface`
        const isFoxStakingRewards = constants_1.UNI_V2_FOX_STAKING_REWARDS_CONTRACTS.some(contract => (0, parser_1.txInteractsWithContract)(tx, contract));
        if (isFoxStakingRewards)
            return await Promise.resolve(this.parseStakingRewards(tx));
    }
    static pairFor(tokenA, tokenB) {
        const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
        const factoryContract = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
        const salt = ethers_1.ethers.utils.solidityKeccak256(['address', 'address'], [token0, token1]);
        const initCodeHash = '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'; // https://github.com/Uniswap/v2-periphery/blob/dda62473e2da448bc9cb8f4514dadda4aeede5f4/contracts/libraries/UniswapV2Library.sol#L24
        return ethers_1.ethers.utils.getCreate2Address(factoryContract, salt, initCodeHash);
    }
}
exports.Parser = Parser;
