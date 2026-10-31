import { describe, expect, it } from 'vitest'

import {
  extractConnectedAccounts,
  getRequestAccount,
  getRequestSigner,
  getSignParamsMessage,
} from './utils'

const a = '0x1111111111111111111111111111111111111111'
const b = '0x2222222222222222222222222222222222222222'
const accountA = `eip155:1:${a}`
const accountB = `eip155:1:${b}`

describe('WalletConnect signer binding', () => {
  it('uses the explicit typed-data signer even when the body contains another account', () => {
    expect(
      getRequestAccount(
        [accountB, accountA],
        'eth_signTypedData_v4',
        [a, JSON.stringify({ message: { owner: b } })],
        'eip155:1',
      ),
    ).toBe(accountA)
  })
  it('does not use a signer from another session or chain', () => {
    const accounts = extractConnectedAccounts({
      namespaces: { eip155: { accounts: [accountA], methods: ['personal_sign'], events: [] } },
    })
    expect(getRequestAccount(accounts, 'personal_sign', ['hello', b], 'eip155:1')).toBeUndefined()
    expect(getRequestAccount(accounts, 'personal_sign', ['hello', a], 'eip155:10')).toBeUndefined()
  })
  it('parses signer and message by the method, including address-shaped messages', () => {
    expect(getRequestSigner('personal_sign', [b, a])).toBe(a)
    expect(getRequestSigner('eth_sign', [a, b])).toBe(a)
    expect(getSignParamsMessage([b, a], false, 'personal_sign')).toBe(b)
    expect(getSignParamsMessage([a, b], false, 'eth_sign')).toBe(b)
  })
  it('requires an exact address and rejects extra transaction objects', () => {
    expect(
      getRequestAccount([accountA], 'eth_sendTransaction', [{ from: a, data: b }], 'eip155:1'),
    ).toBe(accountA)
    expect(
      getRequestAccount([accountA], 'eth_sendTransaction', [{ from: a }, { from: b }], 'eip155:1'),
    ).toBeUndefined()
    expect(
      getRequestAccount([accountA], 'eth_sign', [`prefix${a}`, 'hello'], 'eip155:1'),
    ).toBeUndefined()
  })
  it('matches Cosmos and Bitcoin accounts exactly on the requested chain', () => {
    expect(
      getRequestAccount(
        ['cosmos:cosmoshub-4:cosmos1abc'],
        'cosmos_signAmino',
        { signerAddress: 'cosmos1abc-extra' },
        'cosmos:cosmoshub-4',
      ),
    ).toBeUndefined()
    expect(
      getRequestAccount(
        ['bip122:000000000019d6689c085ae165831e93:bc1abc'],
        'signMessage',
        { account: 'bc1abc-extra' },
        'bip122:000000000019d6689c085ae165831e93',
      ),
    ).toBeUndefined()
  })
})
