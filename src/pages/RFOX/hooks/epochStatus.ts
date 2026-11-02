import type { CurrentEpochMetadata } from '../types'

export const isCurrentEpoch = (metadata: CurrentEpochMetadata, now: number): boolean =>
  Number.isFinite(metadata.epochStartTimestamp) &&
  Number.isFinite(metadata.epochEndTimestamp) &&
  now >= metadata.epochStartTimestamp &&
  now <= metadata.epochEndTimestamp
