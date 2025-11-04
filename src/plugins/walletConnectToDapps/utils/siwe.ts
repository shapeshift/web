/**
 * SIWE (Sign-In with Ethereum) utilities for WalletConnect authentication
 * Handles EIP-4361 message parsing and ReCap decoding
 */

/**
 * Parse a SIWE message string into structured components
 * @param message - The SIWE message string
 * @returns Parsed message components
 */
export const parseSiweMessage = (message: string) => {
  const lines = message.split('\n').filter(line => line.length > 0)

  // Extract domain and address from first two lines
  const domainLine = lines[0]
  const addressLine = lines[1]

  const domain = domainLine?.split(' wants')[0] || ''
  const address = addressLine || ''

  // Find statement (between address and URI)
  let statement = ''
  let currentIndex = 2
  for (let i = 2; i < lines.length; i++) {
    if (lines[i].startsWith('URI:')) {
      break
    }
    if (lines[i]) {
      statement = statement ? `${statement} ${lines[i]}` : lines[i]
    }
    currentIndex = i + 1
  }

  // Extract other fields
  const fields: Record<string, string> = {}
  for (let i = currentIndex; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':').trim()
      fields[key.trim()] = value
    } else if (line.startsWith('- ')) {
      // This is a resource item
      if (!fields['Resources']) {
        fields['Resources'] = []
      }
      ;(fields['Resources'] as any).push(line.substring(2))
    }
  }

  return {
    domain,
    address,
    statement: statement.trim(),
    uri: fields['URI'] || '',
    version: fields['Version'] || '',
    chainId: fields['Chain ID'] || '',
    nonce: fields['Nonce'] || '',
    issuedAt: fields['Issued At'] || '',
    expirationTime: fields['Expiration Time'],
    notBefore: fields['Not Before'],
    requestId: fields['Request ID'],
    resources: fields['Resources'] || [],
  }
}

/**
 * Decode and parse ReCaps from resources array
 * @param resources - Array of resource URIs
 * @returns Decoded ReCap object or null
 */
export const parseReCaps = (resources?: string[]): any | null => {
  if (!resources || resources.length === 0) return null

  const recapUri = resources.find(r => r.startsWith('urn:recap:'))
  if (!recapUri) return null

  try {
    const base64 = recapUri.replace('urn:recap:', '')
    const decoded = JSON.parse(atob(base64))
    return decoded
  } catch (error) {
    console.error('Failed to decode ReCap:', error)
    return null
  }
}

/**
 * Format ReCaps into human-readable permissions list
 * @param recap - The decoded ReCap object
 * @returns Array of formatted permission strings
 */
export const formatRecapsForDisplay = (recap: any): string[] => {
  if (!recap?.att) return []

  const permissions: string[] = []

  // Process EIP-155 permissions
  if (recap.att.eip155) {
    const methods = Object.keys(recap.att.eip155)
    methods.forEach(method => {
      const cleanMethod = method.replace('request/', '')
      permissions.push(`Execute ${cleanMethod}`)
    })
  }

  // Process other resource permissions
  Object.entries(recap.att).forEach(([resource, abilities]) => {
    if (resource === 'eip155') return // Already processed above

    if (typeof abilities === 'object') {
      Object.entries(abilities as any).forEach(([ability, _limits]) => {
        const cleanAbility = ability.replace(/\//g, ' ')
        permissions.push(`${cleanAbility} on ${resource}`)
      })
    }
  })

  return permissions
}

/**
 * Get chain name from chain ID
 * @param chainId - The CAIP-2 chain ID (e.g., 'eip155:1')
 * @returns Human-readable chain name
 */
export const getChainName = (chainId: string): string => {
  const chainMap: Record<string, string> = {
    'eip155:1': 'Ethereum Mainnet',
    'eip155:8453': 'Base',
    'eip155:137': 'Polygon',
    'eip155:10': 'Optimism',
    'eip155:42161': 'Arbitrum One',
    'eip155:43114': 'Avalanche C-Chain',
    'eip155:56': 'BNB Smart Chain',
  }

  return chainMap[chainId] || chainId
}

/**
 * Extract methods from ReCaps
 * @param recap - The decoded ReCap object
 * @returns Array of method names
 */
export const getMethodsFromRecap = (recap: any): string[] => {
  if (!recap?.att?.eip155) return []

  return Object.keys(recap.att.eip155).map(method => method.replace('request/', ''))
}

/**
 * Build the issuer string for SIWE
 * @param chainId - The chain ID (e.g., '8453')
 * @param address - The wallet address
 * @returns DID PKH formatted issuer string
 */
export const buildIssuer = (chainId: string, address: string): string => {
  // Convert to CAIP-10 format if not already
  const chainPrefix = chainId.includes(':') ? chainId : `eip155:${chainId}`
  return `did:pkh:${chainPrefix}:${address}`
}
