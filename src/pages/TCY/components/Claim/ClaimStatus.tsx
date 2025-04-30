import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { ModalCloseButton, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { TransactionStatus } from '../../types'

import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { TransactionStatusDisplay } from '@/components/TransactionStatusDisplay/TransactionStatusDisplay'
interface ClaimStatusProps {
  status: TransactionStatus
}

export const ClaimStatus = ({ status }: ClaimStatusProps) => {
  const translate = useTranslate()

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
            primaryButtonText={translate('TCY.claimStatus.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
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
            primaryButtonText={translate('TCY.claimStatus.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
          />
        )
      case TransactionStatus.Failed:
        return (
          <TransactionStatusDisplay
            icon={WarningTwoIcon}
            iconColor='red.500'
            title={translate('TCY.claimStatus.failedTitle')}
            subtitle={translate('TCY.claimStatus.failedSubtitle')}
            primaryButtonText={translate('TCY.claimStatus.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
          />
        )
      default:
        return null // Or some default state
    }
  }

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeader.Right>
          <ModalCloseButton />
        </DialogHeader.Right>
      </DialogHeader>
      <Stack>{renderStatus()}</Stack>
    </SlideTransition>
  )
}
