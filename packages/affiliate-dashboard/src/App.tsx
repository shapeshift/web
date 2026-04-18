import { useAppKitAccount } from '@reown/appkit/react'
import { useState } from 'react'

import { ConfigBar } from './components/ConfigBar'
import { EmptyState } from './components/EmptyState'
import { Header } from './components/Header'
import { Layout } from './components/Layout'
import { OverviewTab } from './components/overview/OverviewTab'
import { SettingsTab } from './components/settings/SettingsTab'
import { SwapsTab } from './components/swaps/SwapsTab'
import type { TabKey } from './components/TabBar'
import { TabBar } from './components/TabBar'
import { useAffiliateActions } from './hooks/useAffiliateActions'
import { useAffiliateConfig } from './hooks/useAffiliateConfig'
import { useAffiliateStats } from './hooks/useAffiliateStats'
import { useAffiliateSwaps } from './hooks/useAffiliateSwaps'
import { useSiweAuth } from './hooks/useSiweAuth'
import { periods } from './lib/periods'

export const App = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [selectedPeriod, setSelectedPeriod] = useState(0)
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined])

  const { address, isConnected } = useAppKitAccount()

  const {
    isAuthenticated,
    isAuthenticating,
    error: authError,
    signIn,
    signOut,
    authHeaders,
  } = useSiweAuth()

  const affiliateAddress = isConnected && address ? address : ''
  const currentPeriod = periods[selectedPeriod]
  const currentCursor = cursorStack[cursorStack.length - 1]
  const pageNumber = cursorStack.length

  const statsQuery = useAffiliateStats(affiliateAddress, currentPeriod)
  const configQuery = useAffiliateConfig(affiliateAddress)
  const swapsQuery = useAffiliateSwaps(affiliateAddress, currentPeriod, currentCursor)
  const actions = useAffiliateActions({ affiliateAddress, authHeaders })

  const handleSelectPeriod = (index: number): void => {
    setSelectedPeriod(index)
    setCursorStack([undefined])
  }

  const handleNextPage = (): void => {
    const next = swapsQuery.data?.nextCursor
    if (next) setCursorStack(stack => [...stack, next])
  }

  const handlePreviousPage = (): void => {
    setCursorStack(stack => (stack.length > 1 ? stack.slice(0, -1) : stack))
  }

  return (
    <Layout>
      <Header />
      {!isConnected && (
        <EmptyState>Connect your wallet to view your affiliate dashboard.</EmptyState>
      )}
      {isConnected && affiliateAddress && (
        <>
          {configQuery.data && <ConfigBar config={configQuery.data} />}
          <TabBar active={activeTab} onChange={setActiveTab} />
          {activeTab === 'overview' && (
            <OverviewTab
              stats={statsQuery.data}
              isFetching={statsQuery.isFetching || configQuery.isFetching}
              error={statsQuery.error?.message}
              periods={periods}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={handleSelectPeriod}
            />
          )}
          {activeTab === 'swaps' && (
            <SwapsTab
              swaps={swapsQuery.data?.swaps ?? []}
              nextCursor={swapsQuery.data?.nextCursor ?? null}
              pageNumber={pageNumber}
              isFetching={swapsQuery.isFetching}
              error={swapsQuery.error?.message}
              periods={periods}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={handleSelectPeriod}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              affiliateAddress={affiliateAddress}
              config={configQuery.data}
              actions={actions}
              isAuthenticated={isAuthenticated}
              isAuthenticating={isAuthenticating}
              authError={authError}
              onSignIn={() => void signIn()}
              onSignOut={signOut}
              onValidationError={message => actions.setMessage(message)}
            />
          )}
        </>
      )}
    </Layout>
  )
}
