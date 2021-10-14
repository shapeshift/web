import { render } from '@testing-library/react'
import { useFormContext, useWatch } from 'react-hook-form'
import { MemoryRouter } from 'react-router-dom'
import { useAssets } from 'context/AssetProvider/AssetProvider'
import { useSwapper } from 'hooks/useSwapper/useSwapper'

import { TradeRoutes } from './TradeRoutes'

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({ key: '2' }),
  useHistory: jest.fn()
}))
jest.mock('react-hook-form')
jest.mock('hooks/useSwapper/useSwapper')
jest.mock('context/AssetProvider/AssetProvider')

function setup() {
  ;(useAssets as jest.Mock<unknown>).mockImplementation(jest.fn())
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [{}, {}])
  ;(useSwapper as jest.Mock<unknown>).mockImplementation(() => ({
    getCryptoQuote: jest.fn(),
    getFiatQuote: jest.fn(),
    getDefaultPair: jest.fn()
  }))
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue: jest.fn(),
    getValues: () => ({
      crypto: { amount: '1' },
      asset: 'btc'
    })
  }))
  const setDefaultAssets = jest.fn()
  const component = render(
    <MemoryRouter>
      <TradeRoutes />
    </MemoryRouter>
  )
  return { ...component, setDefaultAssets }
}

describe('TradeRoute', () => {
  it('sets the default assets', () => {
    const { setDefaultAssets } = setup()
    expect(setDefaultAssets).toHaveBeenCalled()
  })
})
