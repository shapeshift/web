import type { AccountId } from '@shapeshiftoss/caip'

import { PageBackButton, PageHeader } from '../Layout/Header/PageHeader'
import { Text } from '../Text'

import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'

export const AccountHeader: React.FC<{ accountId?: AccountId }> = ({ accountId }) => {
  const accountLabel = accountId ? accountIdToLabel(accountId) : 'navBar.accounts'
  return (
    <PageHeader>
      <PageHeader.Left>
        <PageBackButton />
      </PageHeader.Left>
      <PageHeader.Middle>
        <Text translation={accountLabel} />
      </PageHeader.Middle>
    </PageHeader>
  )
}
