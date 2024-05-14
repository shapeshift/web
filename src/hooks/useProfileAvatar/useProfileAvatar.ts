import { useMemo } from 'react'
import { makeBlockiesUrl } from 'lib/blockies/makeBlockiesUrl'
import { selectSelectedNftAvatarUrl } from 'state/apis/nft/selectors'
import { selectWalletId } from 'state/selectors/common-selectors'
import { useAppSelector } from 'state/store'

export const useProfileAvatar = () => {
  const walletId = useAppSelector(selectWalletId)
  const selectedNftAvatarUrl = useAppSelector(selectSelectedNftAvatarUrl)
  const walletImage = useMemo(() => {
    if (!walletId) return ''
    if (selectedNftAvatarUrl) return selectedNftAvatarUrl
    /* This needs to be a min of 15 characters so we added a string to ensure its always at least 15 */
    return makeBlockiesUrl(`${walletId}ifyoudriveatruckdriveitlikeyouhaveafarm`)
  }, [selectedNftAvatarUrl, walletId])

  return walletImage
}
