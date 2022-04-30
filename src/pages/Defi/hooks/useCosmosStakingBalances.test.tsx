import { renderHook } from '@testing-library/react-hooks'
import { cosmos, mockAssetState } from 'test/mocks/assets'
import { mockMarketData } from 'test/mocks/marketData'
import { TestProviders } from 'test/TestProviders'
import { ReduxState } from 'state/reducer'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { validatorData } from 'state/slices/validatorDataSlice/validatorDataSlice'
import { store } from 'state/store'

import { useCosmosStakingBalances } from './useCosmosStakingBalances'

jest.mock('state/slices/selectors', () => ({
  ...jest.requireActual('state/slices/selectors'),
  selectAccountSpecifier: (_state: ReduxState) => [
    'cosmos:cosmoshub-4:cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669',
  ],
}))

function setup() {
  const assetData = mockAssetState({
    byId: {
      [cosmos.caip19]: cosmos,
    },
    ids: [cosmos.caip19],
  })
  store.dispatch(assetsSlice.actions.setAssets(assetData))

  const cosmosMarketData = mockMarketData({ price: '77.55' })
  store.dispatch(
    marketDataSlice.actions.setMarketData({
      [cosmos.caip19]: cosmosMarketData,
    }),
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

// TODO: Will unskip
describe.skip('useCosmosStakingBalances', () => {
  it('returns empty array for active opportunities and the shapeshift validator as a staking opportunity when staking data is empty and validators data are loaded', async () => {
    store.dispatch(
      validatorData.actions.upsertValidatorData({
        validators: [],
      }),
    )
    store.dispatch(
      validatorData.actions.upsertValidatorData({
        validators: [],
      }),
    )

    const { result } = setup()
    expect(result.current.stakingOpportunities).toMatchSnapshot()
    expect(result.current.totalBalance).toEqual('0')
  })

  it('returns active and non active staking opportunities when staking and validators data are loaded', async () => {
    store.dispatch(
      validatorData.actions.upsertValidatorData({
        validators: [],
      }),
    )
    store.dispatch(
      validatorData.actions.upsertValidatorData({
        validators: [],
      }),
    )

    const { result } = setup()
    expect(result.current.stakingOpportunities).toMatchSnapshot()
    expect(result.current.totalBalance).toEqual('1.17')
  })
})
