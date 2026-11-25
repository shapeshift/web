import { ChakraProvider } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { I18n } from 'react-polyglot'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GlobalSearchModal } from './GlobalSearchModal'

import { ModalStackProvider } from '@/context/ModalStackProvider'

vi.mock('@/state/store', () => ({
  useAppSelector: () => [],
  useAppDispatch: () => vi.fn(),
  store: { getState: () => ({}) },
}))
vi.mock('@/state/slices/selectors', () => ({
  selectAssets: () => ({}),
  selectAssetsBySearchQuery: () => [],
}))
vi.mock('@/state/slices/tradeInputSlice/tradeInputSlice', () => ({ tradeInput: {} }))
vi.mock('@/lib/customTokenImportSupportedChainIds', () => ({
  CUSTOM_TOKEN_IMPORT_SUPPORTED_CHAIN_IDS: [],
}))
vi.mock('@/components/TradeAssetSearch/hooks/useGetCustomTokensQuery', () => ({
  useGetCustomTokensQuery: () => ({ data: [], isLoading: false }),
}))
vi.mock('@/components/TradeAssetSearch/components/CustomAssetAcknowledgement', () => ({
  CustomAssetAcknowledgement: () => null,
}))
vi.mock('./AssetSearchResults', () => ({ AssetSearchResults: () => null }))

const onClose = vi.fn()
const onToggle = vi.fn()
const messages = { common: { clear: 'Clear', close: 'Close' } }

const Search = () => {
  const [isOpen, setIsOpen] = useState(true)
  const handleClose = () => {
    onClose()
    setIsOpen(false)
  }
  return (
    <ChakraProvider>
      <I18n locale='en' messages={messages}>
        <MemoryRouter>
          <ModalStackProvider>
            <GlobalSearchModal
              isOpen={isOpen}
              onClose={handleClose}
              onOpen={vi.fn()}
              onToggle={onToggle}
            />
          </ModalStackProvider>
        </MemoryRouter>
      </I18n>
    </ChakraProvider>
  )
}

afterEach(() => vi.clearAllMocks())

describe('GlobalSearchModal dismissal', () => {
  it.each(['', 'bitcoin'])('closes without choosing an asset for query "%s"', async query => {
    render(<Search />)
    if (query) fireEvent.change(screen.getByRole('textbox'), { target: { value: query } })

    fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onToggle).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps clearing the query separate from closing the modal', async () => {
    render(<Search />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bitcoin' } })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Clear' }).hasAttribute('disabled')).toBe(false),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })
})
