import { cosmosChainId } from '@keepkey/caip'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { TestProviders } from 'test/TestProviders'
import type { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { useVaultBalances } from 'pages/Defi/hooks/useVaultBalances'

import { useNormalizeOpportunities } from './normalizeOpportunity'

jest.mock('pages/Defi/hooks/useVaultBalances')
jest.mock('@keepkey/investor-yearn')
jest.mock('pages/Defi/hooks/useFoxyBalances')

const mockCosmosStakingOpportunities = [
  {
    address: 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf',
    moniker: 'ShapeShift DAO',
    tokens: '42424242',
    commission: '0.100000000000000000',
    apr: '0.1528209855',
    totalDelegations: '42',
    rewards: '4.2',
    isLoaded: true,
    cryptoAmount: '0.407785',
    tvl: '21040543.6367982',
    fiatAmount: '4.2',
    chainId: cosmosChainId,
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    tokenAddress: '118',
  },
  {
    address: 'cosmosvaloper1clpqr4nrk4khgkxj78fcwwh6dl3uw4epsluffn',
    moniker: 'Cosmostation',
    tokens: '24242424',
    commission: '0.089000000000000000',
    apr: '0.1546887975',
    totalDelegations: '242424',
    rewards: '2.5',
    isLoaded: true,
    cryptoAmount: '0.013967',
    tvl: '63799889.014332',
    fiatAmount: '0.24',
    chainId: cosmosChainId,
    assetId: 'cosmos:cosmoshub-4/slip44:118',
    tokenAddress: '118',
  },
]
function setup({
  cosmosStakingOpportunities,
}: {
  cosmosStakingOpportunities?: MergedActiveStakingOpportunity[]
} = {}) {
  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )
  const { result } = renderHook(
    () =>
      useNormalizeOpportunities({
        cosmosSdkStakingOpportunities: cosmosStakingOpportunities ?? [],
        foxyArray: [],
        vaultArray: [],
      }),
    { wrapper },
  )
  return { result }
}

// TODO(gomes): Unskip me
describe('useNormalizeOpportunities', () => {
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
      cosmosStakingOpportunities: mockCosmosStakingOpportunities,
    })
    expect(result.current).toMatchSnapshot()
  })

  it('returns transformed array of staking opportunities when there is no active staking opportunity', async () => {
    const { result } = setup({ cosmosStakingOpportunities: [] })
    expect(result.current).toMatchSnapshot()
  })
})
