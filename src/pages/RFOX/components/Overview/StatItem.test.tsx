import { ChakraProvider } from '@chakra-ui/react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { StatItem } from './StatItem'

vi.mock('react-polyglot', () => ({ useTranslate: () => (key: string) => key }))
vi.mock('@/components/Text', () => ({
  Text: ({ translation }: { translation: string }) => <span>{translation}</span>,
}))
vi.mock('@/components/Amount/Amount', () => ({
  Amount: { Fiat: ({ value }: { value: string }) => <span>{value}</span> },
}))
vi.mock('@/components/HelperTooltip/HelperTooltip', () => ({
  HelperTooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))
vi.mock('@/components/ChangeTag/ChangeTag', () => ({ ChangeTag: () => null }))

describe('rFOX totals', () => {
  afterEach(cleanup)

  it('shows unavailable and retries a failed request instead of showing stale amounts', () => {
    const retry = vi.fn()
    render(
      <ChakraProvider>
        <StatItem
          description='fees'
          amountUserCurrency='100.00'
          isLoading={false}
          isError
          onRetry={retry}
        />
      </ChakraProvider>,
    )
    expect(screen.getByText('RFOX.dataUnavailable')).toBeDefined()
    expect(screen.queryByText('100.00')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('offers retry when the amount is unavailable without a query error', () => {
    const retry = vi.fn()
    render(
      <ChakraProvider>
        <StatItem description='fees' isLoading={false} onRetry={retry} />
      </ChakraProvider>,
    )
    expect(screen.getByText('RFOX.dataUnavailable')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('renders a successful zero total', () => {
    render(
      <ChakraProvider>
        <StatItem description='fees' amountUserCurrency='0.00' isLoading={false} />
      </ChakraProvider>,
    )
    expect(screen.getByText('0.00')).toBeDefined()
  })
})
