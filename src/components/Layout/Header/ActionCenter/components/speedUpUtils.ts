import { Transaction } from '@shapeshiftoss/bitcoinjs-lib'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import BigNumber from 'bignumber.js'

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
  const isPrecisionValue = /[.eE]/.test(parsed)
  return isPrecisionValue ? bn(parsed).times('100000000') : bn(parsed)
}

export const getTxVsize = (tx: SpeedUpTxLike) => {
  const vsize = bnOrZero(tx.vsize)
  if (vsize.gt(0)) return vsize

  const weight = bnOrZero(tx.weight)
  if (weight.gt(0)) return weight.div(4).integerValue(BigNumber.ROUND_CEIL)

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
  const vinValueSats =
    vinValue !== undefined && vinValue !== null ? toSats(vinValue).toFixed(0) : undefined

  if (vinVout !== undefined && vinVout !== null) {
    const parsedIndex = Number(vinVout)
    if (Number.isInteger(parsedIndex) && parsedIndex >= 0 && parsedIndex < prevTxVouts.length) {
      return parsedIndex
    }
  }

  const valueMatches = prevTxVouts
    .map((vout, index) => ({
      index,
      valueSats:
        vout.value !== undefined && vout.value !== null ? toSats(vout.value).toFixed(0) : undefined,
      addresses: vout.addresses ?? [],
    }))
    .filter(vout => (vinValueSats !== undefined ? vout.valueSats === vinValueSats : true))

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

export type ReconstructedInput = {
  txid: string
  vout: number
  amount: string
  addressNList: number[]
  hex: string
}

export type ReconstructedOutput = {
  address?: string
  amount: string
  isChange: boolean
}

export type OriginalTxSummary = {
  // Sat-value of the original tx fee, fixed integer string.
  feeSats: string
  // Virtual size in vbytes, fixed integer string.
  vsize: string
  // Effective fee rate in sat/vB, 2-decimal precise string.
  feeRate: string
}

export const summarizeOriginalTx = (tx: SpeedUpTxLike): OriginalTxSummary => {
  const feeSats = getTxFeeSats(tx)
  const vsize = getTxVsize(tx)
  const feeRate = getDisplayFeeRateSatPerVbPrecise({
    tx: { ...tx, fee: feeSats.toFixed(0) },
  })
  return {
    feeSats: feeSats.toFixed(0),
    vsize: vsize.toFixed(0),
    feeRate: feeRate.toFixed(2),
  }
}

export const buildOwnedAddressNListMap = (
  accountAddresses: { pubkey: string; path?: string }[] = [],
): Map<string, number[]> => {
  const map = new Map<string, number[]>()
  for (const entry of accountAddresses) {
    if (entry.pubkey && entry.path) {
      map.set(entry.pubkey, bip32ToAddressNList(entry.path))
    }
  }
  return map
}

// A vout is "change" if its address is owned and its BIP44 change index is 1
// (addressNList[3] === 1). The speed-up reissues change outputs at the new fee
// and preserves everything else as-is.
export const classifyOriginalOutputs = ({
  vouts,
  ownedAddressMap,
}: {
  vouts: { value?: TxValue; addresses?: string[] }[]
  ownedAddressMap: Map<string, number[]>
}): ReconstructedOutput[] => {
  return vouts.map(vout => {
    const address = vout.addresses?.[0]
    const addressNList = address ? ownedAddressMap.get(address) : undefined
    return {
      address,
      amount: String(vout.value ?? '0'),
      isChange: addressNList?.[3] === 1,
    }
  })
}

export const reconstructReplacementInputs = ({
  vins,
  prevTxs,
  ownedAddressMap,
  metadata,
}: {
  vins: {
    txid: string
    vout?: string | number | null
    value?: TxValue
    addresses?: string[]
  }[]
  prevTxs: { hex: string; vout: VoutLike[] }[]
  ownedAddressMap: Map<string, number[]>
  metadata?: { inputs: { addressNList?: number[] }[] }
}): ReconstructedInput[] => {
  return vins.map((vin, index) => {
    const prevTx = prevTxs[index]
    const vinAddress = vin.addresses?.[0]
    const voutIndex = resolveVinVoutIndex({
      vinVout: vin.vout,
      vinValue: vin.value,
      vinAddress,
      prevTxVouts: prevTx.vout,
    })

    if (voutIndex === undefined) throw new Error(`Unable to resolve vin.vout for ${vin.txid}`)

    const prevOutputAmount = prevTx.vout[voutIndex]?.value
    const inputAmount = String(vin.value ?? prevOutputAmount ?? '0')

    const metadataAddressNList = metadata?.inputs[index]?.addressNList
    const addressNList =
      (metadataAddressNList?.length ? metadataAddressNList : undefined) ??
      (vinAddress ? ownedAddressMap.get(vinAddress) : undefined)

    if (!addressNList) {
      throw new Error(`Unable to determine BIP44 path for vin address ${vinAddress ?? '(unknown)'}`)
    }

    return {
      txid: vin.txid,
      vout: voutIndex,
      amount: inputAmount,
      addressNList,
      hex: prevTx.hex,
    }
  })
}
