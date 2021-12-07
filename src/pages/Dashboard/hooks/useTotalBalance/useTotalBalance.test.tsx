import { caip19 } from '@shapeshiftoss/caip'
import { findByCaip19 } from '@shapeshiftoss/market-service'
import { Asset, ChainTypes, ContractTypes, MarketData, NetworkTypes } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { rune } from 'jest/mocks/assets'
import { TestProviders } from 'jest/TestProviders'
import { getAssetService } from 'lib/assetService'
import { fetchAsset } from 'state/slices/assetsSlice/assetsSlice'
import { fetchMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { store } from 'state/store'

import { useTotalBalance } from './useTotalBalance'

jest.mock('lib/assetService', () => ({
  service: {
    byTokenId: jest.fn(),
    description: jest.fn()
  },
  getAssetService: jest.fn()
}))

jest.mock('@shapeshiftoss/market-service', () => ({
  findByCaip19: jest.fn()
}))

const balances: ReturnType<typeof useFlattenedBalances>['balances'] = {
  [ChainTypes.Ethereum]: {
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
    symbol: 'ETH',
    pubkey: '0x0000000000000000000000000000000000000000',
    balance: '5000000000000000000',
    chainSpecific: {
      nonce: 0,
      tokens: [
        {
          contractType: ContractTypes.ERC20,
          name: 'THORChain ETH.RUNE',
          contract: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
          symbol: 'RUNE',
          precision: 18,
          balance: '21000000000000000000'
        }
      ]
    }
  },
  '0x3155ba85d5f96b2d030a4966af206230e46849cb': {
    contractType: ContractTypes.ERC20,
    chain: ChainTypes.Ethereum,
    name: 'THORChain ETH.RUNE',
    contract: '0x3155ba85d5f96b2d030a4966af206230e46849cb',
    symbol: 'RUNE',
    precision: 18,
    balance: '21000000000000000000'
  }
}

const setup = ({
  assetData,
  description,
  marketData
}: {
  assetData: Asset | undefined
  description: string | null
  marketData: MarketData | null
}) => {
  ;(getAssetService as unknown as jest.Mock<unknown>).mockImplementation(() => ({
    byTokenId: jest.fn().mockImplementation(() => assetData),
    description: jest.fn().mockImplementation(() => description)
  }))
  ;(findByCaip19 as unknown as jest.Mock<unknown>).mockImplementation(() =>
    Promise.resolve(marketData)
  )
  const wrapper: React.FC = ({ children }) => {
    return <TestProviders>{children}</TestProviders>
  }
  return renderHook(() => useTotalBalance(balances), { wrapper })
}

describe('useTotalBalance', () => {
  it('returns totalBalance for all accounts', async () => {
    return await act(async () => {
      const { result, waitForValueToChange } = setup({
        assetData: rune,
        description: null,
        marketData: {
          price: '10',
          marketCap: '1000000',
          changePercent24Hr: 0.06478,
          volume: '90000'
        }
      })

      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = rune.tokenId
      const runeCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })
      await store.dispatch(fetchAsset(runeCAIP19))
      await store.dispatch(fetchMarketData(runeCAIP19))
      await waitForValueToChange(() => result.current)
      expect(result.current).toBe(210)
    })
  })
})
