import { renderHook } from '@testing-library/react-hooks'
import { TestProviders } from 'test/TestProviders'
import { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosStakingBalances'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'

import { useNormalizeOpportunities } from './normalizeOpportunity'

jest.mock('pages/Defi/hooks/useVaultBalances')
jest.mock('@shapeshiftoss/investor-yearn')
jest.mock('pages/Defi/hooks/useFoxyBalances')

function setup({
  cosmosStakingOpportunities,
}: {
  cosmosStakingOpportunities?: MergedActiveStakingOpportunity[]
} = {}) {
  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  const { result } = renderHook(
    () =>
      useNormalizeOpportunities({
        cosmosStakingOpportunities: cosmosStakingOpportunities ?? [],
        foxyArray: [],
        vaultArray: [],
      }),
    { wrapper },
  )
  return { result }
}

// TODO(gomes): Unskip me
describe.skip('useNormalizeOpportunities', () => {
  beforeEach(() => {
    ;(useVaultBalances as jest.Mock<unknown>).mockImplementation(() => ({
      vaults: [],
      totalBalance: '0',
      loading: false,
    }))
  })

  it('returns empty arrays when provided with empty arrays', async () => {
    const { result } = setup()
    expect(result.current).toEqual([])
  })

  it('returns transformed array of active opportunities sorted by cryptoAmount when there are active staking opportunities', async () => {
    const { result } = setup({
      cosmosStakingOpportunities: [],
    })
    expect(result.current).toMatchSnapshot()
  })

  it('returns transformed array of staking opportunities when there is no active staking opportunity', async () => {
    const { result } = setup({ cosmosStakingOpportunities: [] })
    expect(result.current).toMatchSnapshot()
  })
})
