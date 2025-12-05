export const SUNSWAP_ROUTER_ABI = [
  {
    name: 'swapExactInput',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'string[]', name: 'poolVersion', type: 'string[]' },
      { internalType: 'uint256[]', name: 'versionLen', type: 'uint256[]' },
      { internalType: 'uint24[]', name: 'fees', type: 'uint24[]' },
      {
        internalType: 'struct SwapData',
        name: 'data',
        type: 'tuple',
        components: [
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ internalType: 'uint256[]', name: 'amountsOut', type: 'uint256[]' }],
  },
] as const
