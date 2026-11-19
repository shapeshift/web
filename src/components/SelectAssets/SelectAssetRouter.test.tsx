import type { AssetId } from '@shapeshiftoss/caip'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SelectAssetRouter } from './SelectAssetRouter'

vi.mock('./SelectAssets', () => ({
  SelectAssets: ({ onClick }: { onClick: (assetId: AssetId) => void }) => (
    <button onClick={() => onClick('eip155:1/slip44:60')}>Select Ethereum</button>
  ),
}))

describe('SelectAssetRouter', () => {
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
  })

  it.each(['/wallet', '/assets/eip155:1/slip44:60', '/'])(
    'renders the modal asset selector independently of the browser route %s',
    pathname => {
      window.history.replaceState({}, '', pathname)
      const onClick = vi.fn()
      render(
        <MemoryRouter initialEntries={['/send/address']}>
          <SelectAssetRouter onClick={onClick} />
        </MemoryRouter>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Select Ethereum' }))
      expect(onClick).toHaveBeenCalledWith('eip155:1/slip44:60')
      expect(window.location.pathname).toBe(pathname)
    },
  )
})
