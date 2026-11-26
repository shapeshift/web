import { Card, ChakraProvider } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18n } from 'react-polyglot'
import { describe, expect, it, vi } from 'vitest'

import { TradeInputTab } from '../../types'
import { SharedTradeInputHeader } from './SharedTradeInputHeader'

vi.mock('@/hooks/useFeatureFlag/useFeatureFlag', () => ({ useFeatureFlag: () => true }))

const messages = {
  fiatRamps: { buy: 'Buy', sell: 'Sell' },
  navBar: { market: 'Market' },
  limitOrder: { heading: 'Limit' },
}

describe('SharedTradeInputHeader route changes', () => {
  it('tracks parent buy/sell direction changes and toggles from the current direction', () => {
    const onChangeTab = vi.fn()
    const header = (tab: TradeInputTab) => (
      <ChakraProvider>
        <I18n locale='en' messages={messages}>
          <Card>
            <SharedTradeInputHeader initialTab={tab} onChangeTab={onChangeTab} />
          </Card>
        </I18n>
      </ChakraProvider>
    )
    const { rerender } = render(header(TradeInputTab.BuyFiat))
    expect(screen.getByRole('button', { name: 'Buy', exact: true })).toBeTruthy()

    rerender(header(TradeInputTab.SellFiat))
    fireEvent.click(screen.getByRole('button', { name: 'Sell', exact: true }))
    expect(onChangeTab).toHaveBeenLastCalledWith(TradeInputTab.BuyFiat)

    rerender(header(TradeInputTab.BuyFiat))
    fireEvent.click(screen.getByRole('button', { name: 'Buy', exact: true }))
    expect(onChangeTab).toHaveBeenLastCalledWith(TradeInputTab.SellFiat)
  })
})
