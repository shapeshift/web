import type { evm } from '@shapeshiftoss/common-api'
import type Web3 from 'web3'
import type { AbiItem } from 'web3-utils'

export const TOKEN_INFO_ABI: AbiItem[] = [
  {
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        internalType: 'uint8',
        name: 'decimals',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        internalType: 'string',
        name: 'symbol',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

export const getTokenBalance = async (web3: Web3, contract: string): Promise<evm.TokenBalance> => {
  const tokenContract = new web3.eth.Contract(TOKEN_INFO_ABI, contract)
  const [balance, decimals, name, symbol] = await Promise.all([
    tokenContract.methods.balanceOf().call(),
    tokenContract.methods.decimals().call(),
    tokenContract.methods.symbol().call(),
    tokenContract.methods.name().call(),
  ])
  return { contract, balance, decimals, name, symbol, type: 'ERC20' }
}
