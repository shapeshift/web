import { useMemo } from 'react'

import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { selectWalletId } from '@/state/slices/common-selectors'
import { useAppSelector } from '@/state/store'

export const useProfileAvatar = () => {
  const walletId = useAppSelector(selectWalletId)

  const walletImage = useMemo(() => {
    if (!walletId) return ''
    /* This needs to be a min of 15 characters so we added a string to ensure its always at least 15 */
    return makeBlockiesUrl(`${walletId}ifyoudriveatruckdriveitlikeyouhaveafarm`)
  }, [walletId])

  return walletImage
}
