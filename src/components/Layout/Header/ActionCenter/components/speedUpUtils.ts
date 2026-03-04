import { Transaction } from '@shapeshiftoss/bitcoinjs-lib'

import { bn, bnOrZero } from '@/lib/bignumber/bignumber'

type TxValue = string | number | null | undefined

type VinLike = {
  value?: TxValue
  addresses?: string[]
}

type VoutLike = {
  value?: TxValue
  addresses?: string[]
}

export type SpeedUpTxLike = {
  fee?: TxValue
  vsize?: TxValue
  weight?: TxValue
  hex?: string
  vin: VinLike[]
  vout: VoutLike[]
}

export const toSats = (value?: TxValue) => {
  if (value === undefined || value === null) return bn(0)
  const parsed = String(value)
  return parsed.includes('.') ? bn(parsed).times(1e8) : bn(parsed)
}

export const getTxVsize = (tx: SpeedUpTxLike) => {
  const vsize = bnOrZero(tx.vsize)
  if (vsize.gt(0)) return vsize

  const weight = bnOrZero(tx.weight)
  if (weight.gt(0)) return weight.plus(3).div(4).integerValue()

  if (tx.hex) {
    try {
      return bn(Transaction.fromHex(tx.hex).virtualSize())
    } catch {
      return bn(tx.hex.length / 2)
    }
  }

  return bn(0)
}

export const getTxVirtualBytes = (tx: SpeedUpTxLike) => {
  const vsize = bnOrZero(tx.vsize)
  if (vsize.gt(0)) return vsize

  const weight = bnOrZero(tx.weight)
  if (weight.gt(0)) return weight.div(4)

  if (tx.hex) {
    try {
      return bn(Transaction.fromHex(tx.hex).weight()).div(4)
    } catch {
      return bn(tx.hex.length / 2)
    }
  }

  return bn(0)
}

export const getTxFeeSats = (tx: SpeedUpTxLike) => {
  const feeSats = toSats(tx.fee)
  if (feeSats.gt(0)) return feeSats

  const totalInputSats = tx.vin.reduce((sum, vin) => sum.plus(toSats(vin.value)), bn(0))
  const totalOutputSats = tx.vout.reduce((sum, vout) => sum.plus(toSats(vout.value)), bn(0))

  if (totalInputSats.lte(0) || totalOutputSats.lte(0)) return bn(0)

  return totalInputSats.minus(totalOutputSats)
}

export const getTxFeeRateSatPerVbPrecise = (tx: SpeedUpTxLike) => {
  const virtualBytes = getTxVirtualBytes(tx)
  if (virtualBytes.lte(0)) return bn(0)

  const feeSats = getTxFeeSats(tx)
  if (feeSats.lte(0)) return bn(0)

  return feeSats.div(virtualBytes)
}

export const getTxFeeRateSatPerVb = (tx: SpeedUpTxLike) => {
  return getTxFeeRateSatPerVbPrecise(tx).integerValue()
}

export const getDisplayFeeRateSatPerVb = ({
  tx,
  networkAverageFeeRateSatPerVb,
}: {
  tx: SpeedUpTxLike
  networkAverageFeeRateSatPerVb?: string | number
}) => {
  const txFeeRate = getTxFeeRateSatPerVb(tx)
  if (txFeeRate.gt(0)) return txFeeRate

  const networkFeeRate = bnOrZero(networkAverageFeeRateSatPerVb).integerValue()
  if (networkFeeRate.gt(0)) return networkFeeRate

  return bn(1)
}

export const getDisplayFeeRateSatPerVbPrecise = ({
  tx,
  networkAverageFeeRateSatPerVb,
}: {
  tx: SpeedUpTxLike
  networkAverageFeeRateSatPerVb?: string | number
}) => {
  const txFeeRate = getTxFeeRateSatPerVbPrecise(tx)
  if (txFeeRate.gt(0)) return txFeeRate

  const networkFeeRate = bnOrZero(networkAverageFeeRateSatPerVb)
  if (networkFeeRate.gt(0)) return networkFeeRate

  return bn(1)
}

export const resolveVinVoutIndex = ({
  vinVout,
  vinValue,
  vinAddress,
  prevTxVouts,
}: {
  vinVout?: string | number | null
  vinValue?: TxValue
  vinAddress?: string
  prevTxVouts: VoutLike[]
}) => {
  if (vinVout !== undefined && vinVout !== null) return Number(vinVout)

  const valueMatches = prevTxVouts
    .map((vout, index) => ({
      index,
      value: String(vout.value ?? ''),
      addresses: vout.addresses ?? [],
    }))
    .filter(vout =>
      vinValue !== undefined && vinValue !== null ? vout.value === String(vinValue) : true,
    )

  const addressAndValueMatches = valueMatches.filter(vout =>
    vinAddress ? vout.addresses.includes(vinAddress) : true,
  )
  if (addressAndValueMatches.length === 1) return addressAndValueMatches[0].index

  if (valueMatches.length === 1) return valueMatches[0].index

  const addressMatches = prevTxVouts
    .map((vout, index) => ({ index, addresses: vout.addresses ?? [] }))
    .filter(vout => (vinAddress ? vout.addresses.includes(vinAddress) : false))
  if (addressMatches.length === 1) return addressMatches[0].index

  return undefined
}

export const getTxIdFromHex = (hex?: string) => {
  if (!hex) return undefined

  try {
    return Transaction.fromHex(hex).getId()
  } catch {
    return undefined
  }
}

export const isLikelyBitcoinTxId = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  return /^[a-fA-F0-9]{64}$/.test(value.trim())
}
