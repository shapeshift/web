import { Stack } from '@chakra-ui/react'

import { MultiChainWalletsSection } from './components/MultiChainWalletsSection'
import { WalletConnectTopSection } from './components/WalletConnectTopSection'

type MobileWebSelectContentProps = {
  onWalletSelect: (id: string, initialRoute: string) => void
  selectedWalletId: string | null
}

export const MobileWebSelectContent = ({ onWalletSelect }: MobileWebSelectContentProps) => {
  return (
    <Stack spacing={6} justifyContent='space-between' flex={1}>
      <WalletConnectTopSection />
      <MultiChainWalletsSection onWalletSelect={onWalletSelect} />
    </Stack>
  )
}
