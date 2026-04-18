import { Stack } from '@chakra-ui/react'

import type {
  ActionMessage as ActionMessageType,
  useAffiliateActions,
} from '../../hooks/useAffiliateActions'
import type { AffiliateConfig } from '../../hooks/useAffiliateConfig'
import { ActionMessage } from './ActionMessage'
import { AuthBanner } from './AuthBanner'
import { AuthStatusBar } from './AuthStatusBar'
import { ClaimCodeCard } from './ClaimCodeCard'
import { ConfigSummaryCard } from './ConfigSummaryCard'
import { ReceiveAddressCard } from './ReceiveAddressCard'
import { RegisterCard } from './RegisterCard'
import { AffiliateBpsCard } from './AffiliateBpsCard'

interface SettingsTabProps {
  affiliateAddress: string
  config: AffiliateConfig | undefined
  actions: ReturnType<typeof useAffiliateActions>
  isAuthenticated: boolean
  isAuthenticating: boolean
  authError: string | null
  onSignIn: () => void
  onSignOut: () => void
  onValidationError: (message: ActionMessageType) => void
}

export const SettingsTab = ({
  affiliateAddress,
  config,
  actions,
  isAuthenticated,
  isAuthenticating,
  authError,
  onSignIn,
  onSignOut,
  onValidationError,
}: SettingsTabProps): React.JSX.Element => (
  <Stack spacing={5}>
    {actions.message && (
      <ActionMessage message={actions.message} onDismiss={() => actions.clearMessage()} />
    )}

    {!isAuthenticated && (
      <AuthBanner isAuthenticating={isAuthenticating} error={authError} onSignIn={onSignIn} />
    )}

    {isAuthenticated && <AuthStatusBar onSignOut={onSignOut} />}

    {!config && isAuthenticated && (
      <RegisterCard
        address={affiliateAddress}
        isLoading={actions.isLoading}
        onRegister={bps => void actions.register(bps)}
      />
    )}

    {config && (
      <>
        <ConfigSummaryCard config={config} />
        {isAuthenticated && !config.partnerCode && (
          <ClaimCodeCard isLoading={actions.isLoading} onClaim={code => actions.claimCode(code)} />
        )}
        {isAuthenticated && (
          <AffiliateBpsCard
            currentBps={config.bps}
            isLoading={actions.isLoading}
            onUpdate={bps => actions.updateBps(bps)}
            onValidationError={onValidationError}
          />
        )}
        {isAuthenticated && (
          <ReceiveAddressCard
            config={config}
            isLoading={actions.isLoading}
            onUpdate={addr => actions.updateReceiveAddress(addr)}
            onValidationError={onValidationError}
          />
        )}
      </>
    )}
  </Stack>
)
