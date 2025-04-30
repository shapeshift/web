import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYClaimRoute, TransactionStatus } from '../../types'

import { SlideTransition } from '@/components/SlideTransition'
import { TransactionStatusDisplay } from '@/components/TransactionStatusDisplay/TransactionStatusDisplay'
interface ClaimStatusProps {
  status: TransactionStatus
}

export const ClaimStatus = ({ status }: ClaimStatusProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleBack = useCallback(() => {
    navigate(TCYClaimRoute.Select)
  }, [navigate])

  // TODO: Get transaction hash for View Transaction link
  const handleViewTransaction = useCallback(() => {
    console.log('Navigate to transaction view')
    // Example: navigate(`/tx/${txHash}`)
  }, [])

  const renderStatus = () => {
    switch (status) {
      case TransactionStatus.Pending:
        return (
          <TransactionStatusDisplay
            isLoading
            title={translate('TCY.claimStatus.pendingTitle')}
            primaryButtonText={translate('TCY.claimStatus.back')}
            onPrimaryClick={handleBack}
            secondaryButtonText={translate('TCY.claimStatus.viewTransaction')}
            onSecondaryClick={handleViewTransaction} // TODO: Implement view transaction
          />
        )
      case TransactionStatus.Success:
        // TODO: Get claimed amount
        const claimedAmount = '0.00' // Placeholder
        return (
          <TransactionStatusDisplay
            icon={CheckCircleIcon}
            iconColor='green.500'
            title={translate('TCY.claimStatus.successTitle')}
            subtitle={`You have successfully claimed ${claimedAmount} TCY`}
            primaryButtonText={translate('TCY.claimStatus.goBack')}
            onPrimaryClick={handleBack}
            secondaryButtonText={translate('TCY.claimStatus.viewTransaction')}
            onSecondaryClick={handleViewTransaction} // TODO: Implement view transaction
          />
        )
      case TransactionStatus.Failed:
        return (
          <TransactionStatusDisplay
            icon={WarningTwoIcon}
            iconColor='red.500'
            title={translate('TCY.claimStatus.failedTitle')}
            subtitle={translate('TCY.claimStatus.failedSubtitle')}
            primaryButtonText={translate('TCY.claimStatus.goBack')}
            onPrimaryClick={handleBack}
          />
        )
      default:
        return null // Or some default state
    }
  }

  return (
    <SlideTransition>
      <Stack>{renderStatus()}</Stack>
    </SlideTransition>
  )
}
