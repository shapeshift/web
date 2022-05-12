import { fromAccountId, fromCAIP10, toAccountId, toCAIP10 } from './accountId'

describe('toAccountId', () => {
  it('should have matching CAIP10 aliases', () => {
    expect(toAccountId).toEqual(toCAIP10)
    expect(fromAccountId).toEqual(fromCAIP10)
  })
  it('throws on invalid chainId', () => {
    const chainId = 'eeep:123'
    const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    expect(() => toAccountId({ chainId, account })).toThrow()
  })

  it('throws on empty account', () => {
    const chainId = 'eip155:1'
    const account = ''
    expect(() => toAccountId({ chainId, account })).toThrow()
  })

  it('accepts valid eth chainId and account', () => {
    const chainId = 'eip155:1'
    const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    expect(toAccountId({ chainId, account })).toEqual(`${chainId}:${account}`)
  })

  it('lowercases eth address', () => {
    const chainId = 'eip155:1'
    const account = '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535'
    const lowerAccount = account.toLowerCase()
    expect(toAccountId({ chainId, account })).toEqual(`${chainId}:${lowerAccount}`)
  })

  it('does not lowercase bitcoin account', () => {
    const chainId = 'bip122:000000000019d6689c085ae165831e93'
    const account = '327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn'
    expect(toAccountId({ chainId, account })).toEqual(`${chainId}:${account}`)
  })
})

describe('fromAccountId', () => {
  it('throws on empty string', () => {
    const accountId = ''
    expect(() => fromAccountId(accountId)).toThrow()
  })

  it('returns chainId and account for bitcoin', () => {
    const accountId = 'bip122:000000000019d6689c085ae165831e93:327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn'
    const { account, chainId } = fromAccountId(accountId)
    expect(account).toEqual('327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn')
    expect(chainId).toEqual('bip122:000000000019d6689c085ae165831e93')
  })

  it('returns chainId and account for eth', () => {
    const accountId = 'eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    const { chainId, account } = fromAccountId(accountId)
    expect(chainId).toEqual('eip155:1')
    expect(account).toEqual('0xa44c286ba83bb771cd0107b2c1df678435bd1535')
  })

  it('lowercases eth account', () => {
    const accountId = 'eip155:1:0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535'
    const { chainId, account } = fromAccountId(accountId)
    const lowerAccount = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    expect(chainId).toEqual('eip155:1')
    expect(account).toEqual(lowerAccount)
  })

  it('throws on empty account', () => {
    const accountId = 'eip155:1:'
    expect(() => fromAccountId(accountId)).toThrow()
  })
})
