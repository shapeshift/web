import type { ChainNamespace, ChainReference } from '../chainId/chainId'
import { toChainId } from '../chainId/chainId'
import { CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../constants'
import { fromAccountId, fromCAIP10, toAccountId, toCAIP10 } from './accountId'

describe('toAccountId', () => {
  it('should have matching CAIP10 aliases', () => {
    expect(toAccountId).toEqual(toCAIP10)
    expect(fromAccountId).toEqual(fromCAIP10)
  })
  it('throws on invalid chainId', () => {
    const chainNamespace = 'eeep' as ChainNamespace
    const chainReference = '123' as ChainReference
    const chainId = `${chainNamespace}:${chainReference}`
    const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    expect(() => toAccountId({ chainId, account })).toThrow()
    expect(() => toAccountId({ chainNamespace, chainReference, account })).toThrow()
  })

  it('throws on empty account', () => {
    const chainNamespace = CHAIN_NAMESPACE.Evm
    const chainReference = CHAIN_REFERENCE.EthereumMainnet
    const chainId = toChainId({ chainNamespace, chainReference })
    const account = ''
    expect(() => toAccountId({ chainId, account })).toThrow()
    expect(() => toAccountId({ chainNamespace, chainReference, account })).toThrow()
  })

  it('accepts valid eth chainId and account', () => {
    const chainNamespace = CHAIN_NAMESPACE.Evm
    const chainReference = CHAIN_REFERENCE.EthereumMainnet
    const chainId = toChainId({ chainNamespace, chainReference })
    const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    const expectedAccountId = `${chainId}:${account}`
    expect(toAccountId({ chainId, account })).toEqual(expectedAccountId)
    expect(toAccountId({ chainNamespace, chainReference, account })).toEqual(expectedAccountId)
  })

  it('lowercases eth address', () => {
    const chainNamespace = CHAIN_NAMESPACE.Evm
    const chainReference = CHAIN_REFERENCE.EthereumMainnet
    const chainId = toChainId({ chainNamespace, chainReference })
    const account = '0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535'
    const expectedAccountId = `${chainId}:${account.toLowerCase()}`
    expect(toAccountId({ chainId, account })).toEqual(expectedAccountId)
    expect(toAccountId({ chainNamespace, chainReference, account })).toEqual(expectedAccountId)
  })

  it('does not lowercase bitcoin account', () => {
    const chainNamespace = CHAIN_NAMESPACE.Utxo
    const chainReference = CHAIN_REFERENCE.BitcoinMainnet
    const chainId = toChainId({ chainNamespace, chainReference })
    const account = '327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn'
    const expectedAccountId = `${chainId}:${account}`
    expect(toAccountId({ chainId, account })).toEqual(expectedAccountId)
    expect(toAccountId({ chainNamespace, chainReference, account })).toEqual(expectedAccountId)
  })
})

describe('fromAccountId', () => {
  it('throws on empty string', () => {
    const accountId = ''
    expect(() => fromAccountId(accountId)).toThrow()
  })

  it('returns chainId and account for bitcoin', () => {
    const accountId = 'bip122:000000000019d6689c085ae165831e93:327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn'
    const { account, chainId, chainNamespace, chainReference } = fromAccountId(accountId)
    const expectedAccount = '327aHcrjdooNUzG3qqZkuVZkm3MyjgxScn'
    const expectedChainNamespace = CHAIN_NAMESPACE.Utxo
    const expectedChainReference = CHAIN_REFERENCE.BitcoinMainnet
    expect(account).toEqual(expectedAccount)
    expect(chainNamespace).toEqual(expectedChainNamespace)
    expect(chainReference).toEqual(expectedChainReference)
    expect(chainId).toEqual(`${expectedChainNamespace}:${expectedChainReference}`)
  })

  it('returns chainId and account for dogecoin', () => {
    const accountId = 'bip122:00000000001a91e3dace36e2be3bf030:DDFrdu2AyWCkgpdypkABTnL6FWBGKSAL8V'
    const { account, chainId, chainNamespace, chainReference } = fromAccountId(accountId)
    const expectedAccount = 'DDFrdu2AyWCkgpdypkABTnL6FWBGKSAL8V'
    const expectedChainNamespace = CHAIN_NAMESPACE.Utxo
    const expectedChainReference = CHAIN_REFERENCE.DogecoinMainnet
    expect(account).toEqual(expectedAccount)
    expect(chainNamespace).toEqual(expectedChainNamespace)
    expect(chainReference).toEqual(expectedChainReference)
    expect(chainId).toEqual(`${expectedChainNamespace}:${expectedChainReference}`)
  })

  it('returns chainId and account for eth', () => {
    const accountId = 'eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    const { account, chainId, chainNamespace, chainReference } = fromAccountId(accountId)
    const expectedAccount = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    const expectedChainNamespace = CHAIN_NAMESPACE.Evm
    const expectedChainReference = CHAIN_REFERENCE.EthereumMainnet
    expect(account).toEqual(expectedAccount)
    expect(chainNamespace).toEqual(expectedChainNamespace)
    expect(chainReference).toEqual(expectedChainReference)
    expect(chainId).toEqual(`${expectedChainNamespace}:${expectedChainReference}`)
  })

  it('lowercases eth account', () => {
    const accountId = 'eip155:1:0xA44C286BA83Bb771cd0107B2c1Df678435Bd1535'
    const { account, chainId, chainNamespace, chainReference } = fromAccountId(accountId)
    const expectedAccount = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
    const expectedChainNamespace = CHAIN_NAMESPACE.Evm
    const expectedChainReference = CHAIN_REFERENCE.EthereumMainnet
    expect(account).toEqual(expectedAccount)
    expect(chainNamespace).toEqual(expectedChainNamespace)
    expect(chainReference).toEqual(expectedChainReference)
    expect(chainId).toEqual(`${expectedChainNamespace}:${expectedChainReference}`)
  })

  it('throws on empty account', () => {
    const accountId = 'eip155:1:'
    expect(() => fromAccountId(accountId)).toThrow()
  })
})
