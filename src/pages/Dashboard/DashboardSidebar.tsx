import { Stack } from '@chakra-ui/react'
import { useWallet } from 'context/WalletProvider/WalletProvider'

import { RecentTransactions } from './RecentTransactions'
import { TradeCard } from './TradeCard'

export const DashboardSidebar = () => {
  const {
    state: { isConnected }
  } = useWallet()
  return (
    <Stack width='full' spacing={6}>
      <TradeCard />
      {isConnected && <RecentTransactions />}
    </Stack>
  )
}
