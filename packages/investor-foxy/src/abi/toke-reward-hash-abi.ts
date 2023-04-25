import type { ContractInterface } from 'ethers'

export const tokeRewardHashAbi: ContractInterface = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'cycleIndex', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'latestClaimableHash', type: 'string' },
      { indexed: false, internalType: 'string', name: 'cycleHash', type: 'string' },
    ],
    name: 'CycleHashAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'cycleHashes',
    outputs: [
      { internalType: 'string', name: 'latestClaimable', type: 'string' },
      { internalType: 'string', name: 'cycle', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestCycleIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'index', type: 'uint256' },
      { internalType: 'string', name: 'latestClaimableIpfsHash', type: 'string' },
      { internalType: 'string', name: 'cycleIpfsHash', type: 'string' },
    ],
    name: 'setCycleHashes',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]
