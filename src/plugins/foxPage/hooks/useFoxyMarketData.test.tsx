import { act, renderHook } from '@testing-library/react-hooks'
import { foxy, mockAssetState } from 'test/mocks/assets'
import { TestProviders } from 'test/TestProviders'
import { bn } from 'lib/bignumber/bignumber'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { store } from 'state/store'

import { useFoxyMarketData } from './useFoxyMarketData'

const mockTotalSupply = (value: { tokenContractAddress: string }) => {
  if (value.tokenContractAddress === '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3') {
    return bn('5.01990757409388081123353905e+26')
  }
  return bn('0')
}
jest.mock('features/defi/contexts/FoxyProvider/FoxyProvider', () => {
  return {
    useFoxy: () => {
      return {
        foxy: {
          totalSupply: mockTotalSupply,
        },
      }
    },
  }
})

function setup() {
  const assetData = mockAssetState({
    byId: {
      [foxy.assetId]: foxy,
    },
    ids: [foxy.assetId],
  })
  store.dispatch(assetsSlice.actions.setAssets(assetData))

  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  const { result, waitForNextUpdate } = renderHook(() => useFoxyMarketData(), { wrapper })
  return { result, waitForNextUpdate }
}

describe('useFoxyMarketData', () => {
  it('should return max totaly supply for FOXy', async () => {
    const { result, waitForNextUpdate } = setup()
    await act(async () => waitForNextUpdate())
    expect(result.current.maxTotalSupply).toEqual('501990757.409388081123353905')
  })
})
