import type { JSX } from 'react'

// All routes below are sub-routes and should only be consumed when already in the context of /#/rfox/claim/
export enum ClaimRoutePaths {
  Select = '',
  Confirm = ':claimId/confirm',
  Status = ':claimId/status',
}

export type ClaimRouteProps = {
  headerComponent?: JSX.Element
  setStepIndex?: (index: number) => void
}
