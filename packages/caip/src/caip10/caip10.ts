import { CAIP2, ChainNamespace, isCAIP2 } from './../caip2/caip2'

export type CAIP10 = string

type ToCAIP19Args = {
  caip2: CAIP2
  account: string
}

type ToCAIP10 = (args: ToCAIP19Args) => string

export const toCAIP10: ToCAIP10 = ({ caip2, account }) => {
  if (!isCAIP2(caip2)) {
    throw new Error(`toCAIP10: invalid caip2 ${caip2}`)
  }

  if (!account) {
    throw new Error(`toCAIP10: account is required`)
  }

  const [namespace] = caip2.split(':')

  // we lowercase eth accounts as per the draft spec
  // it's not explicit, but cHecKsUM can be recovered from lowercase eth accounts
  // we don't lowercase bitcoin addresses as they'll fail checksum
  const outputAccount = namespace === ChainNamespace.Ethereum ? account.toLowerCase() : account

  return `${caip2}:${outputAccount}`
}

type FromCAIP10Return = {
  caip2: string
  account: string
}

type FromCAIP10 = (caip10: string) => FromCAIP10Return

export const fromCAIP10: FromCAIP10 = (caip10) => {
  const parts = caip10.split(':')

  if (parts.length !== 3) {
    throw new Error(`fromCAIP10: invalid caip10 ${caip10}`)
  }

  const caip2 = parts.slice(0, 2).join(':')
  if (!isCAIP2(caip2)) {
    throw new Error(`fromCAIP10: invalid caip2 ${caip2}`)
  }
  const account = parts[2]

  if (!account) {
    throw new Error(`fromCAIP10: account required`)
  }

  const [namespace] = caip2.split(':')

  // we lowercase eth accounts as per the draft spec
  // it's not explicit, but cHecKsUM can be recovered from lowercase eth accounts
  // we don't lowercase bitcoin addresses as they'll fail checksum
  const outputAccount = namespace === ChainNamespace.Ethereum ? account.toLowerCase() : account

  return { caip2, account: outputAccount }
}
