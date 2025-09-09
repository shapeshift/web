import type { ReactElement } from 'react'

import { AddressSummaryCard } from '@/plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'

type WalletConnectSigningFromSectionProps = {
  address: string
  walletIcon: ReactElement | null
  explorerAddressLink?: string
}

export const WalletConnectSigningFromSection: React.FC<WalletConnectSigningFromSectionProps> = ({
  address,
  walletIcon,
  explorerAddressLink,
}) => {
  return (
    <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.signingFrom'>
      <AddressSummaryCard
        address={address}
        icon={walletIcon}
        explorerAddressLink={explorerAddressLink}
      />
    </ModalSection>
  )
}
