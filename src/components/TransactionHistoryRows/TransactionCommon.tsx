import { Button } from '@chakra-ui/react'
import { btcChainId, toAccountId } from '@shapeshiftoss/caip'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { TransactionDate } from './TransactionDate'
import { Amount } from './TransactionDetails/Amount'
import { TransactionDetailsContainer } from './TransactionDetails/Container'
import { Row } from './TransactionDetails/Row'
import { Status } from './TransactionDetails/Status'
import { TransactionId } from './TransactionDetails/TransactionId'
import { Transfers } from './TransactionDetails/Transfers'
import { TxGrid } from './TransactionDetails/TxGrid'
import { TransactionGenericRow } from './TransactionGenericRow'
import type { TransactionRowProps } from './TransactionRow'
import { getTransfersByType } from './utils'

import { SpeedUpModal } from '@/components/Layout/Header/ActionCenter/components/SpeedUpModal'
import { RawText } from '@/components/Text'

export const TransactionCommon = ({
  txDetails,
  compactMode,
  isOpen,
  toggleOpen,
  parentWidth,
}: TransactionRowProps) => {
  const translate = useTranslate()
  const transfersByType = useMemo(
    () => getTransfersByType(txDetails.transfers, [TransferType.Send, TransferType.Receive]),
    [txDetails.transfers],
  )

  const hasSend = useMemo(() => {
    return transfersByType && transfersByType.Send && transfersByType.Send.length > 0
  }, [transfersByType])

  const isSpeedUpEligible = useMemo(() => {
    if (txDetails.tx.status !== TxStatus.Pending) return false
    if (txDetails.tx.chainId !== btcChainId) return false
    if (!hasSend) return false
    return true
  }, [txDetails.tx.status, txDetails.tx.chainId, hasSend])

  const accountId = useMemo(() => {
    if (!isSpeedUpEligible) return undefined
    return toAccountId({ chainId: txDetails.tx.chainId, account: txDetails.tx.pubkey })
  }, [isSpeedUpEligible, txDetails.tx.chainId, txDetails.tx.pubkey])

  const [isSpeedUpModalOpen, setIsSpeedUpModalOpen] = useState(false)
  const handleSpeedUpClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsSpeedUpModalOpen(true)
  }, [])
  const handleCloseSpeedUpModal = useCallback(() => setIsSpeedUpModalOpen(false), [])

  return (
    <>
      <TransactionGenericRow
        type={txDetails.type}
        status={txDetails.tx.status}
        toggleOpen={toggleOpen}
        compactMode={compactMode}
        blockTime={txDetails.tx.blockTime}
        transfersByType={transfersByType}
        fee={txDetails.fee}
        txLink={txDetails.txLink}
        txid={txDetails.tx.txid}
        parentWidth={parentWidth}
        txDetails={txDetails}
      />
      <TransactionDetailsContainer isOpen={isOpen} compactMode={compactMode}>
        {txDetails.transfers.length > 0 && (
          <Transfers compactMode={compactMode} transfers={txDetails.transfers} />
        )}
        <TxGrid compactMode={compactMode}>
          <TransactionId txLink={txDetails.txLink} txid={txDetails.tx.txid} />
          <Row title='status'>
            <Status status={txDetails.tx.status} />
          </Row>
          {hasSend && (
            <Row title='minerFee'>
              {txDetails.fee ? (
                <Amount
                  value={txDetails.fee.value}
                  precision={txDetails.fee.asset.precision}
                  symbol={txDetails.fee.asset.symbol}
                />
              ) : (
                <RawText>{'--'}</RawText>
              )}
            </Row>
          )}
          <Row title='date'>
            {txDetails.tx.blockTime ? (
              <TransactionDate blockTime={txDetails.tx.blockTime} />
            ) : (
              <RawText>{'--'}</RawText>
            )}
          </Row>
          {isSpeedUpEligible && (
            <Button size='sm' colorScheme='blue' width='full' onClick={handleSpeedUpClick}>
              {translate('transactionHistory.speedUp')}
            </Button>
          )}
        </TxGrid>
      </TransactionDetailsContainer>
      {isSpeedUpModalOpen && accountId && (
        <SpeedUpModal
          txHash={txDetails.tx.txid}
          accountId={accountId}
          isOpen={isSpeedUpModalOpen}
          onClose={handleCloseSpeedUpModal}
        />
      )}
    </>
  )
}
