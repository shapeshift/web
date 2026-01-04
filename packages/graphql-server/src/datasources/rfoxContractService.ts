import axios from 'axios'

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc'

export type UnstakingRequest = {
  unstakingBalance: string
  cooldownExpiry: string
  index: number
}

export type UnstakingRequestsResult = {
  stakingAssetAccountAddress: string
  contractAddress: string
  unstakingRequests: UnstakingRequest[]
}

const STAKING_CONTRACTS: Record<string, string> = {
  'eip155:42161/erc20:0xac2f8fb059c96c481fda57968d5a30d1ae1f4f2c':
    '0xac2f8fb059c96c481fda57968d5a30d1ae1f4f2c',
  'eip155:42161/erc20:0x808d5f0a62336917da14fa9a10e9575b1f1bfee6':
    '0x808d5f0a62336917da14fa9a10e9575b1f1bfee6',
}

function getContractAddress(stakingAssetId: string): string | undefined {
  return STAKING_CONTRACTS[stakingAssetId]
}

function padAddress(address: string): string {
  return '0x' + address.slice(2).toLowerCase().padStart(64, '0')
}

function padNumber(num: number | bigint): string {
  return '0x' + num.toString(16).padStart(64, '0')
}

async function ethCall(to: string, data: string): Promise<string> {
  const response = await axios.post(ARBITRUM_RPC, {
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{ to, data }, 'latest'],
    id: 1,
  })

  if (response.data.error) {
    throw new Error(response.data.error.message)
  }

  return response.data.result
}

async function getUnstakingRequestCount(contractAddress: string, account: string): Promise<bigint> {
  const data = '0xce0c2d7e' + padAddress(account).slice(2)
  const result = await ethCall(contractAddress, data)
  if (!result || result === '0x') return 0n
  return BigInt(result)
}

async function getUnstakingRequest(
  contractAddress: string,
  account: string,
  index: number,
): Promise<{ unstakingBalance: bigint; cooldownExpiry: bigint }> {
  const data = '0x8e2a2194' + padAddress(account).slice(2) + padNumber(index).slice(2)
  const result = await ethCall(contractAddress, data)

  const unstakingBalance = BigInt('0x' + result.slice(2, 66))
  const cooldownExpiry = BigInt('0x' + result.slice(66, 130))

  return { unstakingBalance, cooldownExpiry }
}

export async function getUnstakingRequests(
  stakingAssetAccountAddress: string,
  stakingAssetId: string,
): Promise<UnstakingRequestsResult | null> {
  const contractAddress = getContractAddress(stakingAssetId)
  if (!contractAddress) {
    console.error(`[RfoxContract] Unknown staking asset: ${stakingAssetId}`)
    return null
  }

  try {
    const count = await getUnstakingRequestCount(contractAddress, stakingAssetAccountAddress)

    if (count === 0n) {
      return {
        stakingAssetAccountAddress,
        contractAddress,
        unstakingRequests: [],
      }
    }

    const requests = await Promise.all(
      Array.from({ length: Number(count) }, async (_, index) => {
        try {
          const result = await getUnstakingRequest(
            contractAddress,
            stakingAssetAccountAddress,
            index,
          )
          return {
            unstakingBalance: result.unstakingBalance.toString(),
            cooldownExpiry: result.cooldownExpiry.toString(),
            index,
          }
        } catch {
          return null
        }
      }),
    )

    const unstakingRequests = requests.filter((req): req is UnstakingRequest => req !== null)

    console.log(
      `[RfoxContract] Found ${unstakingRequests.length} unstaking requests for ${stakingAssetAccountAddress}`,
    )

    return {
      stakingAssetAccountAddress,
      contractAddress,
      unstakingRequests,
    }
  } catch (error) {
    console.error(`[RfoxContract] Failed to fetch unstaking requests:`, error)
    return null
  }
}

export async function batchGetUnstakingRequests(
  requests: { stakingAssetAccountAddress: string; stakingAssetId: string }[],
): Promise<(UnstakingRequestsResult | null)[]> {
  console.log(`[RfoxContract] Batch fetching unstaking requests for ${requests.length} accounts`)

  const results = await Promise.all(
    requests.map(({ stakingAssetAccountAddress, stakingAssetId }) =>
      getUnstakingRequests(stakingAssetAccountAddress, stakingAssetId),
    ),
  )

  return results
}
