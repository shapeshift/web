import { assertGetViemClient } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import { assertUnreachable, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Address, Hex, PublicClient, StateOverride } from 'viem'
import { encodeFunctionData, erc20Abi, getAddress, maxUint256, pad, parseEther, toHex } from 'viem'

import { isNativeEvmAsset } from '../helpers'
import type { StorageLayout } from './storageSlots'
import {
  getAllowanceStorageSlot,
  getBalanceStorageSlot,
  getTokenAllowanceSlot,
  getTokenBalanceSlot,
} from './storageSlots'

// Fail fast - rates run inside the UI's 10s bulk budget and anything slower is degraded service
// where retrying beats waiting (discovered slots are cached, so retries skip discovery)
const ESTIMATION_TIMEOUT_MS = 3_000

// Large native balance for gas (1B is overkill but guarantees success on all chains)
const NATIVE_BALANCE_OVERRIDE = parseEther('1000000000')

// Probe sentinel: distinctive enough that a real balance/allowance can't collide with it, and
// small enough to read back intact through uint96-packed storage (UNI/COMP-style tokens)
const PROBE_SENTINEL = (1n << 88n) - 0xdecafbadn

// Slot numbers seen across known token implementations, swept per layout when access-list
// discovery isn't available (51/52 covers the L2 storage-gap pattern)
const CANDIDATE_SLOTS: Record<StorageLayout, number[]> = {
  solidity: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 51, 52],
  vyper: [0, 1, 2, 3, 4, 5, 6],
}

type SlotLocator = { slotNumber: number; layout: StorageLayout }

const discoveredSlots = new Map<string, SlotLocator>()
const failedSlotDiscoveries = new Map<string, number>()
const FAILED_DISCOVERY_TTL_MS = 60_000

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

type ProbeSlotArgs = SlotProbeBaseArgs & SlotKindArgs & SlotLocator

// A slot guess only counts if a read through the override reflects the written sentinel
const probeSlot = async (args: ProbeSlotArgs): Promise<boolean> => {
  const { client, tokenAddress, owner, slotNumber, layout } = args

  const storageSlot = (() => {
    switch (args.kind) {
      case 'allowance':
        return getAllowanceStorageSlot(owner, args.spender, slotNumber, layout)
      case 'balance':
        return getBalanceStorageSlot(owner, slotNumber, layout)
      default:
        return assertUnreachable(args)
    }
  })()

  const stateOverride = [
    {
      address: tokenAddress,
      stateDiff: [{ slot: storageSlot, value: pad(toHex(PROBE_SENTINEL)) }],
    },
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

    return result === PROBE_SENTINEL
  } catch {
    return false
  }
}

// Caps request gas so nodes that charge the sender up front still accept an unfunded owner
const ACCESS_LIST_GAS = 400_000n

// Mapping slots are recovered by hashing candidate slot numbers against the touched set - 256
// covers storage-gap layouts (slot 51/52 style) with plenty of headroom
const MAX_MAPPED_SLOT = 256

// Ask the node which storage slots the read touches (eth_createAccessList), then recover the
// mapping slot by matching them against locally computed hashes - handles arbitrary slot numbers
// and both hash orders in a single call on supporting rpcs (23 of our 32 EVM chains)
const findSlotViaAccessList = async (
  args: SlotProbeBaseArgs & SlotKindArgs,
): Promise<SlotLocator | undefined> => {
  const { client, tokenAddress, owner } = args

  try {
    const { accessList } = await client.createAccessList({
      account: owner,
      to: tokenAddress,
      data: (() => {
        switch (args.kind) {
          case 'allowance':
            return encodeFunctionData({
              abi: erc20Abi,
              functionName: 'allowance',
              args: [owner, args.spender],
            })
          case 'balance':
            return encodeFunctionData({ abi: erc20Abi, functionName: 'balanceOf', args: [owner] })
          default:
            return assertUnreachable(args)
        }
      })(),
      gas: ACCESS_LIST_GAS,
    })

    // Delegatecall storage reads are attributed to the proxy, so the token's own entry holds them
    const touchedSlots = new Set(
      accessList
        .filter(entry => entry.address.toLowerCase() === tokenAddress.toLowerCase())
        .flatMap(entry => entry.storageKeys.map(storageKey => storageKey.toLowerCase())),
    )

    for (const layout of ['solidity', 'vyper'] as const) {
      for (let slotNumber = 0; slotNumber < MAX_MAPPED_SLOT; slotNumber++) {
        const storageSlot =
          args.kind === 'allowance'
            ? getAllowanceStorageSlot(owner, args.spender, slotNumber, layout)
            : getBalanceStorageSlot(owner, slotNumber, layout)

        if (touchedSlots.has(storageSlot)) return { slotNumber, layout }
      }
    }
  } catch {
    // Unsupported method or node quirk - the candidate sweep covers it
  }

  return undefined
}

// Find the token's balance/allowance mapping slot: known-table guess first, then access-list
// assisted discovery, then a candidate sweep across both layouts. Discovered slots are cached
// per chain+token.
const discoverSlot = async (
  args: SlotProbeBaseArgs & SlotKindArgs & { chainId: string },
): Promise<SlotLocator> => {
  const { chainId, tokenAddress, kind } = args

  const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}:${kind}`

  const cached = discoveredSlots.get(cacheKey)
  if (cached !== undefined) return cached

  // Failures re-probe only after the ttl - covers unknown layouts and rpcs without stateOverride
  // support, which would otherwise pay the full candidate sweep on every rate refresh
  const failedAt = failedSlotDiscoveries.get(cacheKey)
  if (failedAt !== undefined && Date.now() - failedAt < FAILED_DISCOVERY_TTL_MS) {
    throw new Error(`Unable to locate ${kind} storage slot for token ${tokenAddress}`)
  }

  const found = await (async (): Promise<SlotLocator | undefined> => {
    const guess: SlotLocator = {
      slotNumber:
        kind === 'balance'
          ? getTokenBalanceSlot(tokenAddress)
          : getTokenAllowanceSlot(tokenAddress),
      layout: 'solidity',
    }

    if (await probeSlot({ ...args, ...guess })) return guess

    const accessListLocator = await findSlotViaAccessList(args)
    if (accessListLocator && (await probeSlot({ ...args, ...accessListLocator }))) {
      return accessListLocator
    }

    const candidates = (['solidity', 'vyper'] as const)
      .flatMap(layout => CANDIDATE_SLOTS[layout].map(slotNumber => ({ slotNumber, layout })))
      .filter(
        candidate =>
          !(candidate.layout === guess.layout && candidate.slotNumber === guess.slotNumber),
      )

    const results = await Promise.all(
      candidates.map(candidate => probeSlot({ ...args, ...candidate })),
    )

    return candidates.find((_, i) => results[i])
  })()

  if (found === undefined) {
    failedSlotDiscoveries.set(cacheKey, Date.now())
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

  // Override to the larger of the sell amount and the probe sentinel - covers the trade with
  // headroom while leaving high bits clear (a full maxUint256 write would set flag bits and
  // packed-field neighbors, e.g. USDC's slot 9 blacklist bit or UNI's uint96 balances)
  const overrideValue = pad(toHex(sellAmount > PROBE_SENTINEL ? sellAmount : PROBE_SENTINEL))

  const stateDiff = (
    await Promise.all([
      balance < sellAmount
        ? discoverSlot({
            client,
            chainId: sellAsset.chainId,
            tokenAddress,
            kind: 'balance',
            owner: from,
          }).then(({ slotNumber, layout }) => ({
            slot: getBalanceStorageSlot(from, slotNumber, layout),
            value: overrideValue,
          }))
        : undefined,
      spender && allowance < sellAmount
        ? discoverSlot({
            client,
            chainId: sellAsset.chainId,
            tokenAddress,
            kind: 'allowance',
            owner: from,
            spender,
          }).then(({ slotNumber, layout }) => ({
            slot: getAllowanceStorageSlot(from, spender, slotNumber, layout),
            value: overrideValue,
          }))
        : undefined,
    ])
  ).filter((diff): diff is { slot: Hex; value: Hex } => diff !== undefined)

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
