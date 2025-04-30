import { ModalCloseButton } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYClaimRoute } from '../../types'
import { ClaimAddressInput } from './components/ClaimAddressInput'

import { ReusableConfirm } from '@/components/ReusableConfirm/ReusableConfirm'

const headerRightComponent = <ModalCloseButton />

export const ClaimConfirm = () => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleConfirm = useCallback(() => {
    navigate(TCYClaimRoute.Status)
  }, [navigate])

  // TODO: Replace hardcoded values with actual data fetching/state management
  const cryptoAmount = '100'
  const fiatAmount = '100' // Assuming 1 TCY = 1 USD for now
  const feeAmountFiat = '0.00' // Placeholder, fetch actual fee

  return (
    <ReusableConfirm
      assetId={ethAssetId} // Assuming TCY is on Ethereum, adjust if needed
      headerText={translate('TCY.claimConfirm.confirmTitle')}
      cryptoAmount={cryptoAmount}
      cryptoSymbol='TCY'
      fiatAmount={fiatAmount}
      feeAmountFiat={feeAmountFiat}
      confirmText={translate('TCY.claimConfirm.confirmAndClaim')}
      onConfirm={handleConfirm}
      headerRightComponent={headerRightComponent}
    >
      <ClaimAddressInput />
    </ReusableConfirm>
  )
}
