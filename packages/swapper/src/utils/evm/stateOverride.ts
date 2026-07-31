import { assertGetViemClient } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import { assertUnreachable, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Address, Hex, PublicClient, StateOverride } from 'viem'
import { erc20Abi, getAddress, hexToBigInt, maxUint256, pad, parseEther, toHex } from 'viem'

import { isNativeEvmAsset } from '../helpers'
import {
  getAllowanceStorageSlot,
  getBalanceStorageSlot,
  getMaxBalanceValue,
  getTokenAllowanceSlot,
  getTokenBalanceSlot,
} from './storageSlots'

// Fail fast - rates run inside the UI's 10s bulk budget and anything slower is degraded service
// where retrying beats waiting (discovered slots are cached, so retries skip discovery)
const ESTIMATION_TIMEOUT_MS = 3_000

// Large native balance for gas (1B is overkill but guarantees success on all chains)
const NATIVE_BALANCE_OVERRIDE = parseEther('1000000000')

// Slot numbers seen across known token implementations
const CANDIDATE_BALANCE_SLOTS = [0, 1, 2, 3, 5, 9, 51]
const CANDIDATE_ALLOWANCE_SLOTS = [1, 2, 4, 5, 6, 10, 52]

const discoveredSlots = new Map<string, number>()

export const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('State override estimation timed out')),
          ESTIMATION_TIMEOUT_MS,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

type SlotProbeBaseArgs = {
  client: PublicClient
  tokenAddress: Address
  owner: Address
}

type SlotKindArgs = { kind: 'balance' } | { kind: 'allowance'; spender: Address }

type ProbeSlotArgs = SlotProbeBaseArgs & SlotKindArgs & { slotNumber: number }

// A slot guess only counts if a read through the override reflects the written sentinel
const probeSlot = async (args: ProbeSlotArgs): Promise<boolean> => {
  const { client, tokenAddress, owner, slotNumber } = args

  const { storageSlot, sentinel } = (() => {
    switch (args.kind) {
      case 'allowance': {
        const storageSlot = getAllowanceStorageSlot(owner, args.spender, slotNumber)
        const sentinel = toHex(maxUint256)
        return { storageSlot, sentinel }
      }
      case 'balance': {
        const storageSlot = getBalanceStorageSlot(owner, slotNumber)
        const sentinel = getMaxBalanceValue(slotNumber)
        return { storageSlot, sentinel }
      }
      default:
        return assertUnreachable(args)
    }
  })()

  const stateOverride = [
    { address: tokenAddress, stateDiff: [{ slot: storageSlot, value: pad(sentinel) }] },
  ]

  try {
    const result = await (() => {
      switch (args.kind) {
        case 'allowance': {
          return client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [owner, args.spender],
            stateOverride,
          })
        }
        case 'balance': {
          return client.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [owner],
            stateOverride,
          })
        }
        default:
          return assertUnreachable(args)
      }
    })()

    return result === hexToBigInt(sentinel)
  } catch {
    return false
  }
}

// Find the token's balance/allowance mapping slot: try the known-table/pattern guess first, then
// probe the remaining candidates. Discovered slots are cached per chain+token.
const discoverSlot = async (
  args: SlotProbeBaseArgs & SlotKindArgs & { chainId: string },
): Promise<number> => {
  const { chainId, tokenAddress, kind } = args

  const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}:${kind}`

  const cached = discoveredSlots.get(cacheKey)
  if (cached !== undefined) return cached

  const guess =
    kind === 'balance' ? getTokenBalanceSlot(tokenAddress) : getTokenAllowanceSlot(tokenAddress)

  if (await probeSlot({ ...args, slotNumber: guess })) {
    discoveredSlots.set(cacheKey, guess)
    return guess
  }

  const candidates = (
    kind === 'balance' ? CANDIDATE_BALANCE_SLOTS : CANDIDATE_ALLOWANCE_SLOTS
  ).filter(slotNumber => slotNumber !== guess)

  const results = await Promise.all(
    candidates.map(slotNumber => probeSlot({ ...args, slotNumber })),
  )

  const found = candidates.find((_, i) => results[i])

  if (found === undefined) {
    throw new Error(`Unable to locate ${kind} storage slot for token ${tokenAddress}`)
  }

  discoveredSlots.set(cacheKey, found)

  return found
}

export type GetMinimalStateOverrideArgs = {
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  from: string
  // The contract pulling the sell token - omit for trades with no approval involved
  spenderAddress?: string
  value: string
}

// Read the seller's actual balance/allowance and override only what's insufficient for the trade,
// so estimation runs against state as close to execution time as possible
export const getMinimalStateOverride = async ({
  sellAsset,
  sellAmountCryptoBaseUnit,
  from: _from,
  spenderAddress,
  value,
}: GetMinimalStateOverrideArgs): Promise<StateOverride | undefined> => {
  const client = assertGetViemClient(sellAsset.chainId)
  const from = getAddress(_from)
  const valueBigInt = BigInt(value || '0')
  const sellAmount = BigInt(sellAmountCryptoBaseUnit)
  const contractAddress = isNativeEvmAsset(sellAsset.assetId)
    ? undefined
    : contractAddressOrUndefined(sellAsset.assetId)

  const stateOverride: StateOverride = []

  const needsNativeBalance = async () => {
    if (valueBigInt <= 0n) return false
    const balance = await client.getBalance({ address: from })
    return balance < valueBigInt
  }

  if (!contractAddress) {
    if (await needsNativeBalance()) {
      stateOverride.push({ address: from, balance: NATIVE_BALANCE_OVERRIDE })
    }
    return stateOverride.length ? stateOverride : undefined
  }

  const tokenAddress = getAddress(contractAddress)
  const spender = spenderAddress ? getAddress(spenderAddress) : undefined

  const [allowance, balance, nativeBalanceShort] = await Promise.all([
    spender
      ? client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [from, spender],
        })
      : Promise.resolve(maxUint256),
    client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [from],
    }),
    needsNativeBalance(),
  ])

  if (nativeBalanceShort) {
    stateOverride.push({ address: from, balance: NATIVE_BALANCE_OVERRIDE })
  }

  const stateDiff: { slot: Hex; value: Hex }[] = []

  if (balance < sellAmount) {
    const slotNumber = await discoverSlot({
      client,
      chainId: sellAsset.chainId,
      tokenAddress,
      kind: 'balance',
      owner: from,
    })

    stateDiff.push({
      slot: getBalanceStorageSlot(from, slotNumber),
      value: pad(getMaxBalanceValue(slotNumber)),
    })
  }

  if (spender && allowance < sellAmount) {
    const slotNumber = await discoverSlot({
      client,
      chainId: sellAsset.chainId,
      tokenAddress,
      kind: 'allowance',
      owner: from,
      spender,
    })

    stateDiff.push({
      slot: getAllowanceStorageSlot(from, spender, slotNumber),
      value: pad(toHex(maxUint256)),
    })
  }

  if (stateDiff.length) stateOverride.push({ address: tokenAddress, stateDiff })

  return stateOverride.length ? stateOverride : undefined
}

export type EstimateGasWithStateOverrideArgs = GetMinimalStateOverrideArgs & {
  to: string
  data: string
  // Skips the minimal-override reads when the caller already built one
  stateOverride?: StateOverride
}

// Estimate gas for a transaction the seller can't yet execute (unapproved/unfunded), overriding
// only the missing state. Estimation runs on our own RPCs - the node applies the same engine over
// the patched pre-state, so the only systematic delta is the unrealized allowance-decrement refund
// (a few k gas high, conservative).
export const estimateGasWithStateOverride = ({
  to,
  data,
  stateOverride: prebuiltStateOverride,
  ...overrideArgs
}: EstimateGasWithStateOverrideArgs): Promise<string> =>
  withTimeout(
    (async () => {
      const client = assertGetViemClient(overrideArgs.sellAsset.chainId)
      const stateOverride = prebuiltStateOverride ?? (await getMinimalStateOverride(overrideArgs))

      const gasLimit = await client.estimateGas({
        account: getAddress(overrideArgs.from),
        to: getAddress(to),
        data: data as Hex,
        value: BigInt(overrideArgs.value || '0'),
        ...(stateOverride ? { stateOverride } : {}),
      })

      return gasLimit.toString()
    })(),
  )
