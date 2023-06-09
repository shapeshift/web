import type { evm } from '@shapeshiftoss/common-api'
import type Web3 from 'web3'
import type { AbiItem } from 'web3-utils'

import { TOKEN_CONTRACT_ADDRESSES } from './constants'

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

let tokenInfo: Record<string, Omit<evm.TokenBalance, 'balance'>>

export const getTokenInfo = async (
  web3: Web3,
): Promise<Record<typeof TOKEN_CONTRACT_ADDRESSES[number], Omit<evm.TokenBalance, 'balance'>>> => {
  if (tokenInfo === undefined) {
    tokenInfo = Object.fromEntries(
      await Promise.all(
        TOKEN_CONTRACT_ADDRESSES.map(async contractAddress => {
          const tokenContract = new web3.eth.Contract(TOKEN_INFO_ABI, contractAddress)
          const [decimals, name, symbol] = await Promise.all([
            tokenContract.methods.decimals().call(),
            tokenContract.methods.symbol().call(),
            tokenContract.methods.name().call(),
          ])
          return [
            contractAddress,
            { contract: contractAddress, decimals, name, symbol, type: 'ERC20' },
          ]
        }),
      ),
    )
  }

  return tokenInfo
}

export const getTokenBalance = async (
  web3: Web3,
  contractAddress: typeof TOKEN_CONTRACT_ADDRESSES[number],
  address: string,
): Promise<string> => {
  const tokenContract = new web3.eth.Contract(TOKEN_INFO_ABI, contractAddress)
  const balance = await tokenContract.methods.balanceOf(address).call()
  return balance
}
