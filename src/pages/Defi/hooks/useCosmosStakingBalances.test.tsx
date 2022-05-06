import { renderHook } from '@testing-library/react-hooks'
import { cosmos, mockAssetState } from 'test/mocks/assets'
import { mockMarketData } from 'test/mocks/marketData'
import { emptyMockStakingData, mockStakingData, mockValidatorData } from 'test/mocks/stakingData'
import { TestProviders } from 'test/TestProviders'
import { ReduxState } from 'state/reducer'
import { accountSpecifiers } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { stakingData as stakingDataSlice } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { store } from 'state/store'

import { useCosmosStakingBalances } from './useCosmosStakingBalances'

const cosmosAccountSpecifier: string =
  'cosmos:cosmoshub-4:cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669'

jest.mock('state/slices/selectors', () => ({
  ...jest.requireActual('state/slices/selectors'),
  selectAccountSpecifier: (_state: ReduxState) => [
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
    marketDataSlice.actions.setMarketData({
      [cosmos.assetId]: cosmosMarketData,
    }),
  )

  store.dispatch(
    accountSpecifiers.actions.setAccountSpecifiers([
      { 'cosmos:cosmoshub-4': 'cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669' },
    ]),
  )

  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  const { result } = renderHook(
    () =>
      useCosmosStakingBalances({
        assetId: 'cosmos:cosmoshub-4/slip44:118',
      }),
    { wrapper },
  )
  return { result }
}

describe('useCosmosStakingBalances', () => {
  it('returns empty array for active opportunities and the shapeshift validator as a staking opportunity when staking data is empty and validators data are loaded', async () => {
    store.dispatch(
      stakingDataSlice.actions.upsertStakingData({
        stakingData: emptyMockStakingData,
        accountSpecifier: cosmosAccountSpecifier,
      }),
    )
    store.dispatch(
      stakingDataSlice.actions.upsertValidatorData({
        validators: mockValidatorData,
      }),
    )
    store.dispatch(stakingDataSlice.actions.setStatus('loaded'))
    store.dispatch(stakingDataSlice.actions.setValidatorStatus('loaded'))

    const { result } = setup()
    expect(result.current.activeStakingOpportunities).toEqual([])
    expect(result.current.stakingOpportunities).toMatchSnapshot()
    expect(result.current.isLoaded).toBeTruthy()
    expect(result.current.totalBalance).toEqual('0')
  })

  it('returns active and non active staking opportunities when staking and validators data are loaded', async () => {
    store.dispatch(
      stakingDataSlice.actions.upsertStakingData({
        stakingData: mockStakingData,
        accountSpecifier: cosmosAccountSpecifier,
      }),
    )
    store.dispatch(
      stakingDataSlice.actions.upsertValidatorData({
        validators: mockValidatorData,
      }),
    )
    store.dispatch(stakingDataSlice.actions.setStatus('loaded'))
    store.dispatch(stakingDataSlice.actions.setValidatorStatus('loaded'))

    const { result } = setup()
    expect(result.current.activeStakingOpportunities).toMatchSnapshot()
    expect(result.current.stakingOpportunities).toMatchSnapshot()
    expect(result.current.isLoaded).toBeTruthy()
    expect(result.current.totalBalance).toEqual('1.17')
  })
})
