import { renderHook } from '@testing-library/react-hooks'
import merge from 'lodash/merge'
import {
  cosmosCaip19,
  mockCosmosAccount,
  mockCosmosAccountWithStakingData,
} from 'test/mocks/accounts'
import { cosmos, mockAssetState } from 'test/mocks/assets'
import { mockMarketData } from 'test/mocks/marketData'
import { mockUpsertPortfolio } from 'test/mocks/portfolio'
import { TestProviders } from 'test/TestProviders'
import { ReduxState } from 'state/reducer'
import { accountSpecifiers } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { portfolio as portfolioSlice } from 'state/slices/portfolioSlice/portfolioSlice'
import { validatorData } from 'state/slices/validatorDataSlice/validatorDataSlice'
import { store } from 'state/store'

import { useCosmosStakingBalances } from './useCosmosStakingBalances'

jest.mock('state/slices/selectors', () => ({
  ...jest.requireActual('state/slices/selectors'),
  selectFirstAccountSpecifierByChainId: (_state: ReduxState) => [
    'cosmos:cosmoshub-4:cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669',
  ],
}))

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'
const SHAPESHIFT_OPPORTUNITY = {
  address: SHAPESHIFT_VALIDATOR_ADDRESS,
  moniker: 'Shapeshift DAO',
  tokens: '111111',
  apr: '0.24',
  commission: '0.100000000000000000',
}

const MOCK_VALIDATORS = merge(
  [
    {
      address: 'cosmosvaloper19ggkjc5slg5gphf92yrvusr3jc702h4tfz6nvn',
      moniker: 'IZ*ONE',
      tokens: '60102',
      commission: '0.040000000000000000',
      apr: '0.1631159915',
    },
    {
      address: 'cosmosvaloper19f0w9svr905fhefusyx4z8sf83j6et0g9l5yhl',
      moniker: 'NodeStake.top',
      tokens: '1366570093',
      commission: '0.010000000000000000',
      apr: '0.1682133662',
    },
    {
      address: 'cosmosvaloper1xhhquwctvwm40qn3nmmqq067pc2gw22eqkwgt0',
      moniker: 'stake2earn',
      tokens: '4474530413',
      commission: '0.010000000000000000',
      apr: '0.1682133662',
    },
  ],
  [SHAPESHIFT_OPPORTUNITY],
)

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

// TODO: Will unskip
describe('useCosmosStakingBalances', () => {
  it('returns empty array for active opportunities and the shapeshift validator as a staking opportunity when staking data is empty and validators data are loaded', async () => {
    store.dispatch(
      validatorData.actions.upsertValidatorData({
        validators: MOCK_VALIDATORS,
      }),
    )
    store.dispatch(
      validatorData.actions.upsertValidatorData({
        validators: MOCK_VALIDATORS,
      }),
    )

    const { result } = setup()
    expect(result.current.stakingOpportunities).toMatchSnapshot()
    expect(result.current.totalBalance).toEqual('0')
  })

  it('returns active and non active staking opportunities when staking and validators data are loaded', async () => {
    store.dispatch(
      validatorData.actions.upsertValidatorData({
        validators: MOCK_VALIDATORS,
      }),
    )

    const cosmosAccount = mockCosmosAccount(mockCosmosAccountWithStakingData)

    store.dispatch(
      portfolioSlice.actions.upsertPortfolio(mockUpsertPortfolio([cosmosAccount], [cosmosCaip19])),
    )

    const { result } = setup()
    expect(result.current.stakingOpportunities).toMatchSnapshot()
    expect(result.current.totalBalance).toEqual('1.17')
  })
})
