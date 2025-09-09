import type { ReactElement } from 'react'

import { AddressSummaryCard } from '@/plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'

type WalletConnectAddressSectionProps = {
  address: string
  walletIcon: ReactElement | null
  explorerAddressLink?: string
}

export const WalletConnectAddressSection: React.FC<WalletConnectAddressSectionProps> = ({
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
