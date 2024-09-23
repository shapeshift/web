import { Link } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { getTxLink } from 'lib/getTxLink'
import { selectFirstHopSellAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type SharedCompletedApprovalDescriptionProps = {
  tradeQuoteStep: TradeQuoteStep
  txHash: string
  isError: boolean
  errorTranslation: string
}

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
      {isError && <Text color='text.error' translation={errorTranslation} fontWeight='bold' />}

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
  isError: boolean
  errorTranslation: string
}

export const SharedApprovalDescription = ({
  tradeQuoteStep,
  isError,
  txHash,
  approvalNetworkFeeCryptoFormatted,
  errorTranslation,
  gasFeeLoadingTranslation,
  gasFeeTranslation,
}: SharedApprovalDescriptionProps) => {
  if (!txHash) {
    return (
      <>
        {isError && <Text color='text.error' translation={errorTranslation} fontWeight='bold' />}

        <Text
          color='text.subtle'
          translation={
            !Boolean(approvalNetworkFeeCryptoFormatted)
              ? gasFeeLoadingTranslation
              : [
                  gasFeeTranslation,
                  {
                    fee: approvalNetworkFeeCryptoFormatted,
                  },
                ]
          }
          fontWeight='bold'
        />
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
