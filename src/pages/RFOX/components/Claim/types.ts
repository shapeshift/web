import type { JSX } from 'react'

import type { UnstakingRequest } from '../../hooks/useGetUnstakingRequestsQuery'

export enum ClaimRoutePaths {
  Select = '/claim',
  Confirm = '/claim/:claimId/confirm',
  Status = '/claim/:claimId/status',
}

export type ClaimRouteProps = {
  headerComponent?: JSX.Element
  setStepIndex: (index: number) => void
}

export type RfoxClaimQuote = {
  request: UnstakingRequest
}
