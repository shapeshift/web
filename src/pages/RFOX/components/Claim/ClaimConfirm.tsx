import type { FC } from 'react'

import type { ClaimRouteProps } from './types'

type ClaimConfirmProps = {
  claimTxid: string | undefined
  setClaimTxid: (txId: string) => void
}

export const ClaimConfirm: FC<ClaimRouteProps & ClaimConfirmProps> = () => {
  return <></>
}
