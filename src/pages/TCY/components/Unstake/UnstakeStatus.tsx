import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYUnstakeRoute, TransactionStatus } from '../../types'

import { SlideTransition } from '@/components/SlideTransition'
import { TransactionStatusDisplay } from '@/components/TransactionStatusDisplay/TransactionStatusDisplay'

export const UnstakeStatus: React.FC<{ status: TransactionStatus }> = ({ status }) => {
  const translate = useTranslate()
  const navigate = useNavigate()

  // TODO: Get claimed amount
  const claimedAmount = '0.00' // Placeholder

  const handleViewTransaction = useCallback(() => {
    console.log('Navigate to transaction view')
    // Example: navigate(`/tx/${txHash}`)
  }, [])

  const handleGoBack = useCallback(() => {
    navigate(TCYUnstakeRoute.Input)
  }, [navigate])

  const renderStatus = () => {
    switch (status) {
      case TransactionStatus.Pending:
        return (
          <TransactionStatusDisplay
            isLoading
            title={translate('TCY.unstakeStatus.pendingTitle')}
            subtitle={translate('TCY.unstakeStatus.pendingSubtitle', { amount: claimedAmount })}
            primaryButtonText={translate('TCY.unstakeStatus.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
          />
        )
      case TransactionStatus.Success:
        return (
          <TransactionStatusDisplay
            icon={CheckCircleIcon}
            iconColor='green.500'
            title={translate('TCY.unstakeStatus.successTitle')}
            subtitle={translate('TCY.unstakeStatus.successSubtitle', { amount: claimedAmount })}
            secondaryButtonText={translate('TCY.unstakeStatus.viewTransaction')}
            onSecondaryClick={handleViewTransaction}
            primaryButtonText={translate('TCY.unstakeStatus.goBack')}
            onPrimaryClick={handleGoBack}
          />
        )
      case TransactionStatus.Failed:
        return (
          <TransactionStatusDisplay
            icon={WarningTwoIcon}
            iconColor='red.500'
            title={translate('TCY.unstakeStatus.failedTitle')}
            subtitle={translate('TCY.unstakeStatus.failedSubtitle')}
            primaryButtonText={translate('TCY.unstakeStatus.goBack')}
            onPrimaryClick={handleGoBack}
          />
        )
      default:
        return null // Or some default state
    }
  }
  return <SlideTransition>{renderStatus()}</SlideTransition>
}
