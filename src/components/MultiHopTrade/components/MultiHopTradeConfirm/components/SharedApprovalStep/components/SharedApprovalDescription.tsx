import { Link } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { getTxLink } from 'lib/getTxLink'
import { selectFirstHopSellAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ErrorMsgProps = {
  isError: boolean
  errorTranslation: string
}

const ErrorMsg = ({ isError, errorTranslation }: ErrorMsgProps) => {
  return isError ? (
    <Text color='text.error' translation={errorTranslation} fontWeight='bold' />
  ) : null
}

type SharedCompletedApprovalDescriptionProps = {
  tradeQuoteStep: TradeQuoteStep
  txHash: string
} & ErrorMsgProps

export const SharedCompletedApprovalDescription = ({
  tradeQuoteStep,
  isError,
  txHash,
  errorTranslation,
}: SharedCompletedApprovalDescriptionProps) => {
  // this is the account we're selling from - assume this is the AccountId of the approval Tx
  const firstHopSellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txHash,
    accountId: firstHopSellAccountId,
  })

  const txLink = useMemo(
    () =>
      getTxLink({
        defaultExplorerBaseUrl: tradeQuoteStep.sellAsset.explorerTxLink,
        maybeSafeTx,
        tradeId: txHash ?? '',
        accountId: firstHopSellAccountId,
      }),
    [firstHopSellAccountId, maybeSafeTx, tradeQuoteStep.sellAsset.explorerTxLink, txHash],
  )

  return (
    <>
      <ErrorMsg isError={isError} errorTranslation={errorTranslation} />
      <Link isExternal href={txLink} color='text.link'>
        <MiddleEllipsis value={maybeSafeTx?.transaction?.transactionHash ?? txHash} />
      </Link>
    </>
  )
}

type SharedApprovalDescriptionProps = {
  tradeQuoteStep: TradeQuoteStep
  txHash: string | undefined
  approvalNetworkFeeCryptoFormatted: string | undefined
  gasFeeLoadingTranslation: string
  gasFeeTranslation: string
  isAwaitingReset?: boolean
  isLoadingNetworkFee?: boolean
} & ErrorMsgProps

export const SharedApprovalDescription = ({
  tradeQuoteStep,
  isError,
  txHash,
  approvalNetworkFeeCryptoFormatted,
  errorTranslation,
  gasFeeLoadingTranslation,
  gasFeeTranslation,
  isLoadingNetworkFee = false,
}: SharedApprovalDescriptionProps) => {
  const translate = useTranslate()

  if (!txHash) {
    return (
      <>
        <ErrorMsg isError={isError} errorTranslation={errorTranslation} />
        {isLoadingNetworkFee
          ? translate(gasFeeLoadingTranslation)
          : translate(gasFeeTranslation, {
              fee: approvalNetworkFeeCryptoFormatted ?? '',
            })}
      </>
    )
  }

  return (
    <SharedCompletedApprovalDescription
      tradeQuoteStep={tradeQuoteStep}
      isError={isError}
      txHash={txHash}
      errorTranslation={errorTranslation}
    />
  )
}
