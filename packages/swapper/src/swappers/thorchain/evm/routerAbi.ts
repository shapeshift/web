import { AbiItem } from 'web3-utils'
/* eslint-disable */

export const routerAbi: AbiItem[] = [
  {
    "inputs": [{ "internalType": "address", "name": "rune", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "asset", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "memo", "type": "string" }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "oldVault", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newVault", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "asset", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "memo", "type": "string" }
    ],
    "name": "TransferAllowance",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "vault", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "asset", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "memo", "type": "string" }
    ],
    "name": "TransferOut",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "oldVault", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newVault", "type": "address" },
      {
        "components": [
          { "internalType": "address", "name": "asset", "type": "address" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "indexed": false,
        "internalType": "struct THORChain_Router.Coin[]",
        "name": "coins",
        "type": "tuple[]"
      },
      { "indexed": false, "internalType": "string", "name": "memo", "type": "string" }
    ],
    "name": "VaultTransfer",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "RUNE",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address payable", "name": "vault", "type": "address" },
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "memo", "type": "string" }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address payable", "name": "vault", "type": "address" },
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "memo", "type": "string" },
      { "internalType": "uint256", "name": "expiration", "type": "uint256" }
    ],
    "name": "depositWithExpiry",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "router", "type": "address" },
      { "internalType": "address payable", "name": "asgard", "type": "address" },
      {
        "components": [
          { "internalType": "address", "name": "asset", "type": "address" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "internalType": "struct THORChain_Router.Coin[]",
        "name": "coins",
        "type": "tuple[]"
      },
      { "internalType": "string", "name": "memo", "type": "string" }
    ],
    "name": "returnVaultAssets",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "router", "type": "address" },
      { "internalType": "address", "name": "newVault", "type": "address" },
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "memo", "type": "string" }
    ],
    "name": "transferAllowance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address payable", "name": "to", "type": "address" },
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "memo", "type": "string" }
    ],
    "name": "transferOut",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "vault", "type": "address" },
      { "internalType": "address", "name": "token", "type": "address" }
    ],
    "name": "vaultAllowance",
    "outputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
]
