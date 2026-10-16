import { Stack } from '@chakra-ui/react'

import type {
  ActionMessage as ActionMessageType,
  useAffiliateActions,
} from '../../hooks/useAffiliateActions'
import type { AffiliateConfig } from '../../hooks/useAffiliateConfig'
import { AccessManagementCard } from './AccessManagementCard'
import { ActionMessage } from './ActionMessage'
import { AffiliateBpsCard } from './AffiliateBpsCard'
import { AuthBanner } from './AuthBanner'
import { AuthStatusBar } from './AuthStatusBar'
import { ConfigSummaryCard } from './ConfigSummaryCard'
import { ReceiveAddressCard } from './ReceiveAddressCard'
import { RegisterCard } from './RegisterCard'

interface SettingsTabProps {
  affiliateAddress: string
  config: AffiliateConfig | undefined
  actions: ReturnType<typeof useAffiliateActions>
  authHeaders: Record<string, string>
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
  authHeaders,
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
        onRegister={args => actions.register(args)}
        onValidationError={onValidationError}
      />
    )}

    {config && (
      <>
        <ConfigSummaryCard config={config} />
        {isAuthenticated && (
          <>
            <AffiliateBpsCard
              currentBps={config.partnerBps}
              isLoading={actions.isLoading}
              onUpdate={bps => actions.updateBps(bps)}
              onValidationError={onValidationError}
            />
            <ReceiveAddressCard
              config={config}
              isLoading={actions.isLoading}
              onUpdate={addr => actions.updateReceiveAddress(addr)}
              onValidationError={onValidationError}
            />
            <AccessManagementCard
              affiliateAddress={affiliateAddress}
              authHeaders={authHeaders}
              setMessage={actions.setMessage}
            />
          </>
        )}
      </>
    )}
  </Stack>
)
