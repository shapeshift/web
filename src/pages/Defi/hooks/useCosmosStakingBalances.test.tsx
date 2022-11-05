import { cosmosAssetId } from '@keepkey/caip'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { mockCosmosAccount, mockCosmosAccountWithStakingData } from 'test/mocks/accounts'
import { cosmos, mockAssetState } from 'test/mocks/assets'
import { mockMarketData } from 'test/mocks/marketData'
import { mockUpsertPortfolio } from 'test/mocks/portfolio'
import { MOCK_VALIDATORS } from 'test/mocks/validators'
import { TestProviders } from 'test/TestProviders'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import type { ReduxState } from 'state/reducer'
import { accountSpecifiers } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio as portfolioSlice } from 'state/slices/portfolioSlice/portfolioSlice'
import { validatorData } from 'state/slices/validatorDataSlice/validatorDataSlice'
import { store } from 'state/store'

jest.mock('state/slices/selectors', () => ({
  ...jest.requireActual('state/slices/selectors'),
  selectFirstAccountSpecifierByChainId: (_state: ReduxState) => [
    'cosmos:cosmoshub-4:cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669',
  ],
}))

function setup() {
  const assetData = mockAssetState({
    byId: {
      [cosmos.assetId]: cosmos,
    },
    ids: [cosmos.assetId],
  })
  store.dispatch(assetsSlice.actions.setAssets(assetData))

  const cosmosMarketData = mockMarketData({ price: '77.55' })
  store.dispatch(
    marketDataSlice.actions.setCryptoMarketData({
      [cosmos.assetId]: cosmosMarketData,
    }),
  )

  store.dispatch(
    accountSpecifiers.actions.upsertAccountSpecifiers([
      { 'cosmos:cosmoshub-4': 'cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669' },
    ]),
  )

  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )
  const { result } = renderHook(
    () =>
      useCosmosSdkStakingBalances({
        assetId: 'cosmos:cosmoshub-4/slip44:118',
      }),
    { wrapper },
  )
  return { result }
}

describe('useCosmosStakingBalances', () => {
  it('returns active and non active staking opportunities when staking and validators data are loaded', async () => {
    store.dispatch(
      validatorData.actions.upsertValidatorData({
        validators: MOCK_VALIDATORS,
      }),
    )

    const cosmosAccount = mockCosmosAccount(mockCosmosAccountWithStakingData)

    store.dispatch(
      portfolioSlice.actions.upsertPortfolio(mockUpsertPortfolio([cosmosAccount], [cosmosAssetId])),
    )

    const { result } = setup()
    expect(result.current.cosmosSdkStakingOpportunities).toMatchSnapshot()
    expect(result.current.totalBalance).toEqual('1.17')
  })
})
