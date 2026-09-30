import { arbitrumAssetId, ethAssetId } from '@shapeshiftoss/caip'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { I18n } from 'react-polyglot'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ArbitrumBridgeWithdrawActionCard } from './ArbitrumBridgeWithdrawActionCard'

import en from '@/assets/translations/en/main.json'
import type { ArbitrumBridgeWithdrawAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'

vi.mock('@/state/store', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) => selector({}),
  store: { getState: () => ({ preferences: { selectedLocale: 'en' } }) },
}))

vi.mock('@/state/slices/selectors', () => ({
  selectAssetById: (_state: unknown, assetId: string) => ({
    assetId,
    chainId: assetId.split('/')[0],
    symbol: 'ETH',
    precision: 18,
  }),
  selectFeeAssetByChainId: () => ({ explorerTxLink: 'https://example.com/tx/' }),
}))

vi.mock('./ActionCard', () => ({
  ActionCard: ({ description }: { description: ReactNode }) => <div>{description}</div>,
}))

vi.mock('./ActionStatusIcon', () => ({ ActionStatusIcon: () => null }))
vi.mock('./ActionStatusTag', () => ({ ActionStatusTag: () => null }))
vi.mock('@/components/AssetIconWithBadge', () => ({ AssetIconWithBadge: () => null }))
vi.mock('@/lib/getTxLink', () => ({ getTxLink: () => 'https://example.com/tx/0x123' }))

const action: ArbitrumBridgeWithdrawAction = {
  id: 'bridge-withdrawal',
  type: ActionType.ArbitrumBridgeWithdraw,
  status: ActionStatus.Claimed,
  createdAt: 0,
  updatedAt: 0,
  arbitrumBridgeMetadata: {
    withdrawTxHash: '0x123',
    claimTxHash: '0x456',
    amountCryptoBaseUnit: '1234567890000000000',
    assetId: arbitrumAssetId,
    destinationAssetId: ethAssetId,
    accountId: 'eip155:42161:0x123',
    destinationAccountId: 'eip155:1:0x123',
    timeRemainingSeconds: 3600,
  },
}

describe('ArbitrumBridgeWithdrawActionCard', () => {
  afterEach(cleanup)

  it.each([
    [ActionStatus.Claimed, 'Your bridge of 1.23456789 ETH is complete.'],
    [ActionStatus.Pending, 'Your bridge of 1.23456789 ETH is being processed.'],
    [ActionStatus.ClaimAvailable, 'Your bridge of 1.23456789 ETH is available to claim.'],
    [ActionStatus.Initiated, 'Your withdraw of 1.23456789 ETH will be available in an hour.'],
  ])('interpolates the withdrawal description for %s', (status, expectedDescription) => {
    const { container } = render(
      <I18n locale='en' messages={en}>
        <ArbitrumBridgeWithdrawActionCard action={{ ...action, status }} onClaimClick={vi.fn()} />
      </I18n>,
    )

    expect(screen.getByText(expectedDescription)).toBeDefined()
    expect(container.textContent).not.toContain('%{')
  })
})
