// Contract detection utilities for WalletConnect transactions

// Known DEX router addresses across chains
const KNOWN_CONTRACTS: Record<
  string,
  { name: string; type: 'dex' | 'bridge' | 'lending' | 'nft'; icon?: string }
> = {
  // Uniswap V3 Router
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { name: 'Uniswap', type: 'dex' },
  '0xe592427a0aece92de3edee1f18e0157c05861564': { name: 'Uniswap V3', type: 'dex' },

  // 1inch Aggregation Router V5
  '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch', type: 'dex' },

  // OpenSea Seaport
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': { name: 'OpenSea', type: 'nft' },

  // Aave V3 Pool
  '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': { name: 'Aave', type: 'lending' },
}

// Common ERC20/ERC721 function selectors
const FUNCTION_SIGNATURES: Record<string, string> = {
  // ERC20
  '0x095ea7b3': 'approve',
  '0xa9059cbb': 'transfer',
  '0x23b872dd': 'transferFrom',

  // Uniswap V3
  '0x04e45aaf': 'exactInputSingle',
  '0xb858183f': 'exactInput',
  '0x5023b4df': 'exactOutputSingle',
  '0x09b81346': 'exactOutput',

  // 1inch
  '0x12aa3caf': 'swap',
  '0xe449022e': 'uniswapV3Swap',
  '0x7c025200': 'swap',

  // Generic DEX
  '0x38ed1739': 'swapExactTokensForTokens',
  '0x8803dbee': 'swapTokensForExactTokens',
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0x18cbafe5': 'swapExactTokensForETH',
}

export const detectContractType = (
  address: string,
): { name: string; type: string; icon?: string } | null => {
  const normalized = address.toLowerCase()
  const contract = KNOWN_CONTRACTS[normalized]
  return contract || null
}

export const getFunctionName = (data: string): string | null => {
  if (!data || data.length < 10) return null
  const selector = data.slice(0, 10).toLowerCase()
  return FUNCTION_SIGNATURES[selector] || null
}

export const parseApprovalData = (
  data: string,
  _chainId: string,
): { spender: string; amount: string; amountRaw: string; isUnlimited: boolean } | null => {
  const functionName = getFunctionName(data)
  if (functionName !== 'approve') return null

  try {
    // Remove function selector (4 bytes = 8 hex chars + 0x)
    const params = data.slice(10)

    // Approve has 2 params: address (32 bytes) and uint256 (32 bytes)
    const spender = '0x' + params.slice(24, 64) // address is right-padded in 32 bytes
    const amountHex = params.slice(64, 128)

    // Check if it's max uint256 (unlimited approval)
    const isUnlimited = amountHex === 'f'.repeat(64)
    const amountRaw = BigInt('0x' + amountHex).toString()

    return {
      spender: spender.toLowerCase(),
      amount: isUnlimited ? 'Unlimited' : amountRaw,
      amountRaw,
      isUnlimited,
    }
  } catch {
    return null
  }
}

export const parseTransferData = (data: string): { to: string; amount: string } | null => {
  const functionName = getFunctionName(data)
  if (functionName !== 'transfer') return null

  try {
    const params = data.slice(10)
    const to = '0x' + params.slice(24, 64)
    const amountHex = params.slice(64, 128)
    const amount = BigInt('0x' + amountHex).toString()

    return { to: to.toLowerCase(), amount }
  } catch {
    return null
  }
}

// Try to detect token addresses from common swap function patterns
export const extractTokensFromSwapData = (
  data: string,
  _chainId: string,
): { inputToken?: string; outputToken?: string } | null => {
  const functionName = getFunctionName(data)
  if (!functionName || !functionName.includes('swap')) return null

  // This is simplified - real implementation would need ABI decoding
  // For now, just return null - proper implementation would decode based on function signature
  return null
}
