import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYStakeRoute, TransactionStatus } from '../../types'

import { SlideTransition } from '@/components/SlideTransition'
import { TransactionStatusDisplay } from '@/components/TransactionStatusDisplay/TransactionStatusDisplay'

export const StakeStatus: React.FC<{ status: TransactionStatus }> = ({ status }) => {
  const translate = useTranslate()
  const navigate = useNavigate()

  // TODO: Get claimed amount
  const claimedAmount = '0.00' // Placeholder

  const handleViewTransaction = useCallback(() => {
    console.log('Navigate to transaction view')
    // Example: navigate(`/tx/${txHash}`)
  }, [])

  const handleGoBack = useCallback(() => {
    navigate(TCYStakeRoute.Input)
  }, [navigate])

  const renderStatus = () => {
    switch (status) {
      case TransactionStatus.Pending:
        return (
          <TransactionStatusDisplay
            isLoading
            title={translate('TCY.stakeStatus.pendingTitle')}
            subtitle={translate('TCY.stakeStatus.pendingSubtitle', { amount: claimedAmount })}
            primaryButtonText={translate('TCY.stakeStatus.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
          />
        )
      case TransactionStatus.Success:
        return (
          <TransactionStatusDisplay
            icon={CheckCircleIcon}
            iconColor='green.500'
            title={translate('TCY.stakeStatus.successTitle')}
            subtitle={translate('TCY.stakeStatus.successSubtitle', { amount: claimedAmount })}
            secondaryButtonText={translate('TCY.stakeStatus.viewTransaction')}
            onSecondaryClick={handleViewTransaction}
            primaryButtonText={translate('TCY.stakeStatus.goBack')}
            onPrimaryClick={handleGoBack}
          />
        )
      case TransactionStatus.Failed:
        return (
          <TransactionStatusDisplay
            icon={WarningTwoIcon}
            iconColor='red.500'
            title={translate('TCY.stakeStatus.failedTitle')}
            subtitle={translate('TCY.stakeStatus.failedSubtitle')}
            primaryButtonText={translate('TCY.stakeStatus.goBack')}
            onPrimaryClick={handleGoBack}
          />
        )
      default:
        return null // Or some default state
    }
  }
  return <SlideTransition>{renderStatus()}</SlideTransition>
}
