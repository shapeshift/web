import axios from 'axios'

import { getCoinbasePayAssets } from './coinbase-pay'

jest.mock('config', () => ({
  getConfig: () => ({
    REACT_APP_COINBASE_SUPPORTED_COINS: 'https://api.pro.coinbase.com/currencies',
  }),
}))
jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

const mockedCoinbaseCurrencies = [
  {
    id: 'BTC',
    name: 'Bitcoin',
    min_size: '0.00000001',
    status: 'online',
    message: '',
    max_precision: '0.00000001',
    convertible_to: [],
    details: {
      type: 'crypto',
      symbol: '₿',
      network_confirmations: 2,
      sort_order: 20,
      crypto_address_link: 'https://live.blockcypher.com/btc/address/{{address}}',
      crypto_transaction_link: 'https://live.blockcypher.com/btc/tx/{{txId}}',
      push_payment_methods: ['crypto'],
      group_types: ['btc', 'crypto'],
      display_name: null,
      processing_time_seconds: null,
      min_withdrawal_amount: 0.0001,
      max_withdrawal_amount: 2400,
    },
    default_network: 'bitcoin',
    supported_networks: [],
  },
  {
    id: 'ATOM',
    name: 'Cosmos',
    min_size: '1',
    status: 'online',
    message: '',
    max_precision: '0.000001',
    convertible_to: [],
    details: {
      type: 'crypto',
      symbol: null,
      network_confirmations: 0,
      sort_order: 51,
      crypto_address_link: 'https://cosmos.bigdipper.live/account/{{address}}',
      crypto_transaction_link: 'https://cosmos.bigdipper.live/transactions/{{txId}}',
      push_payment_methods: ['crypto'],
      group_types: [],
      display_name: null,
      processing_time_seconds: 5,
      min_withdrawal_amount: 0.1,
      max_withdrawal_amount: 302000,
    },
    default_network: 'cosmos',
    supported_networks: [],
  },
  {
    id: 'USD',
    name: 'United States Dollar',
    min_size: '0.01',
    status: 'online',
    message: '',
    max_precision: '0.01',
    convertible_to: ['USDC'],
    details: {
      type: 'fiat',
      symbol: '$',
      network_confirmations: null,
      sort_order: 1,
      crypto_address_link: null,
      crypto_transaction_link: null,
      push_payment_methods: ['bank_wire', 'fedwire', 'swift_bank_account', 'intra_bank_account'],
      group_types: ['fiat', 'usd'],
      display_name: 'US Dollar',
      processing_time_seconds: null,
      min_withdrawal_amount: null,
      max_withdrawal_amount: null,
    },
    default_network: '',
    supported_networks: [],
  },
  {
    id: 'FOX',
    name: 'ShapeShift FOX Token',
    min_size: '0.1',
    status: 'online',
    message: '',
    max_precision: '0.00000001',
    convertible_to: [],
    details: {
      type: 'crypto',
      symbol: null,
      network_confirmations: 14,
      sort_order: 675,
      crypto_address_link:
        'https://etherscan.io/token/0xc770eefad204b5180df6a14ee197d99d808ee52d?a={{address}}',
      crypto_transaction_link: 'https://etherscan.io/tx/0x{{txId}}',
      push_payment_methods: ['crypto'],
      group_types: [],
      display_name: null,
      processing_time_seconds: null,
      min_withdrawal_amount: 1e-8,
      max_withdrawal_amount: 370000,
    },
    default_network: 'ethereum',
    supported_networks: [],
  },
]

describe('coinbase-pay', () => {
  it('should properly transfor assets', async () => {
    mockAxios.get.mockImplementation(() => {
      return Promise.resolve({
        data: mockedCoinbaseCurrencies,
      })
    })
    const expected = [
      {
        name: 'Bitcoin',
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        symbol: 'BTC',
      },
      {
        name: 'Cosmos',
        assetId: 'cosmos:cosmoshub-4/slip44:118',
        symbol: 'ATOM',
      },
      {
        name: 'ShapeShift FOX Token',
        assetId: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
        symbol: 'FOX',
      },
    ]
    const cryptos = await getCoinbasePayAssets()
    expect(cryptos).toStrictEqual(expected)
  })
})
