import { renderHook } from '@testing-library/react-hooks'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import dayjs from 'dayjs'

import { getDate, useTransactions, UseTransactionsPropType } from './useTransactions'

jest.mock('context/WalletProvider/WalletProvider', () => ({
  useWallet: () => ({ state: { wallet: {}, walletInfo: { deviceId: 'test' } } })
}))

jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider', () => ({
  useChainAdapters: jest.fn()
}))

function setup({ chain, contractAddress, symbol }: UseTransactionsPropType = {}) {
  return renderHook(() => useTransactions({ chain, contractAddress, symbol }))
}

const createMockData = (symbols: string[], filteredSymbol?: string) => {
  const walletAddress = '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'
  const network = 'ethereum'
  const status = 'confirmed'
  const to = '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
  const from = '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'
  const blockHash = '0x22b141ae643d73e14d5826cef99a96ba2675da5d03eef8e3c29cb0b5fb32f267'
  const txid = '0x3e8bad229754db284bbec6b6f40eccbda2f72801c03e181ffb253fcd23a40c26'
  const timestamp = 1629215917
  const blockHeight = 13043667
  const confirmations = 111311
  const value = '100000000000000'
  const date = getDate(timestamp)
  const dateFromNow = dayjs(date).fromNow()

  const transactions = symbols.map(symbol => {
    return {
      fee: '3459277000000000',
      blockHash,
      blockHeight,
      confirmations,
      from,
      network,
      status,
      symbol,
      timestamp,
      to,
      txid,
      value
    }
  })

  const adapter = [
    jest.fn(() => ({
      getType: jest.fn(() => 'ethereum'),
      getAddress: jest.fn(() => Promise.resolve(walletAddress)),
      getTxHistory: jest.fn(() => Promise.resolve({ transactions }))
    }))
  ]

  // If filteredSymbol is passed in, filter any other symbols out when creating the payload
  const filteredPayloadBySymbol = !filteredSymbol
    ? symbols
    : symbols.filter(symbol => symbol === filteredSymbol)

  const payload = {
    txs: filteredPayloadBySymbol.map(symbol => {
      return {
        type: 'Sent',
        amount: '0.0001',
        fee: '0.003459',
        date,
        dateFromNow,
        blockHash,
        blockHeight,
        confirmations,
        from,
        network,
        status,
        symbol,
        timestamp,
        to,
        txid,
        value
      }
    })
  }

  return { adapter, payload }
}

describe('useTransactions', () => {
  it('returns formatted tx history with chain, contractAddress, and symbol provided', async () => {
    const filteredSymbol = 'FOX'
    const { adapter, payload } = createMockData(['FOX'], filteredSymbol)

    //@ts-ignore
    useChainAdapters.mockImplementation(() => ({
      getSupportedAdapters: jest.fn(() => adapter)
    }))

    const { result, waitForValueToChange } = setup({
      chain: 'ethereum',
      contractAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      symbol: filteredSymbol
    })

    await waitForValueToChange(() => result.current.txHistory)
    expect(result.current.txHistory).toEqual(payload)
    expect(result.current.loading).toBeFalsy()
  })

  it('returns all formatted tx history when chain, contractAddress, and symbol are NOT provided', async () => {
    const { adapter, payload } = createMockData(['FOX', 'LINK'])

    //@ts-ignore
    useChainAdapters.mockImplementation(() => ({
      getSupportedAdapters: jest.fn(() => adapter)
    }))

    const { result, waitForValueToChange } = setup()

    await waitForValueToChange(() => result.current.txHistory)
    expect(result.current.txHistory).toEqual(payload)
    expect(result.current.loading).toBeFalsy()
  })
})
