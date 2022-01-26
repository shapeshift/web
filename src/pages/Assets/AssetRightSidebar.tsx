import { Stack } from '@chakra-ui/react'
import { TradeCard } from 'pages/Dashboard/TradeCard'

export const AssetRightSidebar = () => {
  return (
    <Stack flex={1} spacing={4}>
      <TradeCard />
    </Stack>
  )
}
