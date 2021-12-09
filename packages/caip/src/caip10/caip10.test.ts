import { fromCAIP10, toCAIP10 } from './caip10'

describe('toCAIP10', () => {
  it('throws on invalid caip', () => {
    const caip2 = 'eeep:123'
    const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    expect(() => toCAIP10({ caip2, account })).toThrow()
  })

  it('throws on empty account', () => {
    const caip2 = 'eip155:1'
    const account = ''
    expect(() => toCAIP10({ caip2, account })).toThrow()
  })

  it('accepts valid eth caip and account', () => {
    const caip2 = 'eip155:1'
    const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    expect(toCAIP10({ caip2, account })).toEqual(`${caip2}:${account}`)
  })

  it('lowercases eth address', () => {
    const caip2 = 'eip155:1'
    const account = '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535'
    const lowerAccount = account.toLowerCase()
    expect(toCAIP10({ caip2, account })).toEqual(`${caip2}:${lowerAccount}`)
  })

  it('does not lowercase bitcoin account', () => {
    const caip2 = 'bip122:000000000019d6689c085ae165831e93'
    const account = '327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn'
    expect(toCAIP10({ caip2, account })).toEqual(`${caip2}:${account}`)
  })
})

describe('fromCAIP10', () => {
  it('throws on empty string', () => {
    const caip10 = ''
    expect(() => fromCAIP10(caip10)).toThrow()
  })

  it('returns caip2 and account for bitcoin', () => {
    const caip10 = 'bip122:000000000019d6689c085ae165831e93:327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn'
    const { account, caip2 } = fromCAIP10(caip10)
    expect(account).toEqual('327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn')
    expect(caip2).toEqual('bip122:000000000019d6689c085ae165831e93')
  })

  it('returns caip2 and account for eth', () => {
    const caip10 = 'eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    const { caip2, account } = fromCAIP10(caip10)
    expect(caip2).toEqual('eip155:1')
    expect(account).toEqual('0xa44c286ba83bb771cd0107b2c1df678435bd1535')
  })

  it('lowercases eth account', () => {
    const caip10 = 'eip155:1:0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535'
    const { caip2, account } = fromCAIP10(caip10)
    const lowerAccount = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    expect(caip2).toEqual('eip155:1')
    expect(account).toEqual(lowerAccount)
  })

  it('throws on empty account', () => {
    const caip10 = 'eip155:1:'
    expect(() => fromCAIP10(caip10)).toThrow()
  })
})
