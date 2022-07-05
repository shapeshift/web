import merge from 'lodash/merge'
import { SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS } from 'state/slices/validatorDataSlice/constants'

export const SHAPESHIFT_OPPORTUNITY = {
  address: SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  moniker: 'Shapeshift DAO',
  tokens: '111111',
  apr: '0.24',
  commission: '0.100000000000000000',
}

export const MOCK_VALIDATORS = merge(
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
