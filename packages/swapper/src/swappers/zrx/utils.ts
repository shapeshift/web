import axios from 'axios'
import BigNumber from 'bignumber.js'

const axiosConfig = {
  baseURL: 'https://api.0x.org/',
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
}

export const zrxService = axios.create(axiosConfig)

export const normalizeAmount = (amount: string | undefined): string | undefined => {
  if (!amount) return undefined
  return new BigNumber(amount).toNumber().toLocaleString('fullwide', { useGrouping: false })
}
