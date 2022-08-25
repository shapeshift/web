import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { Accounts as AccountsV1 } from './V1/Accounts'
import { Accounts as AccountsV2 } from './V2/Accounts'

export const Accounts = () => {
  const multiAccountEnabled = useFeatureFlag('MultiAccounts')
  return multiAccountEnabled ? <AccountsV2 /> : <AccountsV1 />
}
