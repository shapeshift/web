import type { BitcoinUtxo } from '../utils/bitcoinPsbt'

const UNCHAINED_BITCOIN_API = 'https://api.bitcoin.shapeshift.com/api/v1'

type UnchainedAccount = { balance: string; unconfirmedBalance?: string }
type UnchainedUtxo = { txid: string; vout: number; value: string }
type UnchainedNetworkFee = { satsPerKiloByte: number }
type UnchainedNetworkFees = Partial<Record<'fast' | 'average' | 'slow', UnchainedNetworkFee>>

const getJson = async <T>(path: string, label: string): Promise<T> => {
  const response = await fetch(`${UNCHAINED_BITCOIN_API}${path}`)
  if (!response.ok) throw new Error(`Failed to fetch Bitcoin ${label}: ${response.status}`)
  return response.json()
}

export const getBitcoinBalance = async (address: string): Promise<string> => {
  const { balance, unconfirmedBalance } = await getJson<UnchainedAccount>(
    `/account/${address}`,
    'balance',
  )
  return (BigInt(balance) + BigInt(unconfirmedBalance ?? '0')).toString()
}

export const getBitcoinUtxos = async (address: string): Promise<BitcoinUtxo[]> => {
  const utxos = await getJson<UnchainedUtxo[]>(`/account/${address}/utxos`, 'UTXOs')
  return utxos.map(({ txid, vout, value }) => ({ txid, vout, value: BigInt(value) }))
}

export const getBitcoinFeePerByte = async (): Promise<bigint> => {
  const fees = await getJson<UnchainedNetworkFees>('/fees', 'fee rate')
  // Unchained can rank tiers out of order, so fast is lifted to the highest tier like the app does
  const satsPerKiloByte = Math.max(
    ...[fees.fast, fees.average, fees.slow].map(fee => fee?.satsPerKiloByte ?? 0),
  )
  if (!satsPerKiloByte) throw new Error('Failed to fetch Bitcoin fee rate')
  return BigInt(Math.max(1, Math.ceil(satsPerKiloByte / 1000)))
}

export const getBitcoinTxHex = async (txid: string): Promise<string> => {
  const { hex } = await getJson<{ hex: string }>(`/tx/${txid}`, 'transaction')
  return hex
}

export const broadcastBitcoinTx = async (txHex: string): Promise<void> => {
  const response = await fetch(`${UNCHAINED_BITCOIN_API}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hex: txHex }),
  }).catch(() => undefined)

  // No response may still mean the tx landed, so status tracking decides
  if (!response || response.ok) return

  const { message } = await response.json().catch(() => ({ message: response.statusText }))
  throw new Error(`Failed to broadcast transaction: ${message}`)
}
