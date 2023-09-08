"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErc20Data = void 0;
const contracts_1 = require("@ethersproject/contracts");
const erc20Abi_json_1 = __importDefault(require("./erc20Abi.json"));
const getErc20Data = async (to, value, contractAddress) => {
    if (!contractAddress)
        return '';
    const erc20Contract = new contracts_1.Contract(contractAddress, erc20Abi_json_1.default);
    const { data: callData } = await erc20Contract.populateTransaction.transfer(to, value);
    return callData || '';
};
exports.getErc20Data = getErc20Data;
