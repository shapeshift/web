import { Box, Flex } from '@chakra-ui/react'
import { useAppKitAccount } from '@reown/appkit/react'
import { useMemo, useState } from 'react'

import { ConfigBar } from './components/ConfigBar'
import { EmptyState } from './components/EmptyState'
import { Header } from './components/Header'
import { Layout } from './components/Layout'
import { OverviewTab } from './components/overview/OverviewTab'
import { PeriodSelector } from './components/PeriodSelector'
import { SettingsTab } from './components/settings/SettingsTab'
import { SwapsTab } from './components/swaps/SwapsTab'
import type { TabKey } from './components/TabBar'
import { TabBar } from './components/TabBar'
import { useAffiliateActions } from './hooks/useAffiliateActions'
import { useAffiliateConfig } from './hooks/useAffiliateConfig'
import { useAffiliateStats } from './hooks/useAffiliateStats'
import { useAffiliateSwaps } from './hooks/useAffiliateSwaps'
import { useSiweAuth } from './hooks/useSiweAuth'
import { currentMonthKey, generatePeriods } from './lib/periods'

export const App = (): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [selectedKey, setSelectedKey] = useState<string>(() => currentMonthKey())

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
  const configQuery = useAffiliateConfig(affiliateAddress)

  const periods = useMemo(
    () => generatePeriods(configQuery.data?.createdAt),
    [configQuery.data?.createdAt],
  )

  const currentPeriod = periods.find(p => p.key === selectedKey) ?? periods[0]

  const statsQuery = useAffiliateStats(affiliateAddress, currentPeriod)
  const swapsQuery = useAffiliateSwaps(affiliateAddress, currentPeriod)
  const actions = useAffiliateActions({ affiliateAddress, authHeaders })

  const swaps = useMemo(
    () => swapsQuery.data?.pages.flatMap(page => page.swaps) ?? [],
    [swapsQuery.data],
  )

  return (
    <Layout>
      <Header />
      {!isConnected && (
        <EmptyState>Connect your wallet to view your affiliate dashboard.</EmptyState>
      )}
      {isConnected && affiliateAddress && (
        <>
          {configQuery.data && <ConfigBar config={configQuery.data} />}
          <Flex
            align='flex-end'
            gap={3}
            mb={6}
            minH={16}
            borderBottom='1px solid'
            borderColor='border.subtle'
          >
            <TabBar active={activeTab} onChange={setActiveTab} />
            {activeTab !== 'settings' && (
              <Box mb={3}>
                <PeriodSelector
                  periods={periods}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                />
              </Box>
            )}
          </Flex>
          <Box flex={1} minH={0} display='flex' flexDirection='column'>
            {activeTab === 'overview' && (
              <OverviewTab
                stats={statsQuery.data}
                isFetching={statsQuery.isFetching || configQuery.isFetching}
                error={statsQuery.error?.message}
              />
            )}
            {activeTab === 'swaps' && (
              <SwapsTab
                swaps={swaps}
                isLoading={swapsQuery.isLoading}
                isFetchingNextPage={swapsQuery.isFetchingNextPage}
                hasNextPage={swapsQuery.hasNextPage}
                error={swapsQuery.error?.message}
                onLoadMore={() => void swapsQuery.fetchNextPage()}
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
          </Box>
        </>
      )}
    </Layout>
  )
}
