import type { Infer } from 'myzod'
import { array, boolean, keySignature, number, object, string, unknown } from 'myzod'

const MethodABI = object({
  name: string(),
  type: string(),
  inputs: array(
    object({
      name: string(),
      type: string(),
      internalType: string(),
    }),
  ),
  outputs: array(
    object({
      name: string(),
      type: string(),
      internalType: string(),
    }),
  ),
  payable: boolean(),
  constant: boolean(),
  stateMutability: string(),
})

const StrategySchema = object({
  name: string(),
  params: object({
    address: string().optional(),
    decimals: number().optional(),
    symbol: string().optional(),
    tokenAddress: string().optional(),
    stakingAddress: string().optional(),
    uniswapAddress: string().optional(),
    contractAddress: string().optional(),
  }),
  network: string().optional(),
})

export type Strategy = Infer<typeof StrategySchema>

const Params = object({
  symbol: string().optional(),
  address: string().optional(),
  decimals: number().optional(),
  graphs: object({
    '100': string().optional(),
    '137': string().optional(),
  }).optional(),
  methodABI: MethodABI.optional(),
  token: string().optional(),
  contractAddress: string().optional(),
  strategies: array(StrategySchema).optional(),
  delegationSpace: string().optional(),
  contracts: array(string()).optional(),
  multiplier: number().optional(),
  // pass through unknown keys
  [keySignature]: unknown(),
})

const SpaceStrategy = object({
  name: string(),
  network: string(),
  params: Params,
})

const Space = object({
  strategies: array(SpaceStrategy),
})

const Data = object({
  space: Space,
})

export const SnapshotSchema = object({
  data: Data,
})

export type SnapshotStrategies = Infer<typeof SnapshotSchema>

// ###### voting power

export const VotingPowerSchema = object({
  vp: number(),
  vp_by_strategy: array(number()),
  vp_state: string(),
})

export type VotingPower = Infer<typeof VotingPowerSchema>
