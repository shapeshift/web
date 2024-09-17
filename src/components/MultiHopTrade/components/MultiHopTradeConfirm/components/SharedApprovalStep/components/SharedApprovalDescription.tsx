import { Link } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'

type SharedCompletedApprovalDescriptionProps = {
  tradeQuoteStep: TradeQuoteStep
  isError: boolean
  txHash: string
  errorTranslation: string
}

export const SharedCompletedApprovalDescription = ({
  tradeQuoteStep,
  isError,
  txHash,
  errorTranslation,
}: SharedCompletedApprovalDescriptionProps) => {
  const errorMsg = isError ? (
    <Text color='text.error' translation={errorTranslation} fontWeight='bold' />
  ) : null

  const href = `${tradeQuoteStep.sellAsset.explorerTxLink}${txHash}`

  return (
    <>
      {errorMsg}
      <Link isExternal href={href} color='text.link'>
        <MiddleEllipsis value={txHash} />
      </Link>
    </>
  )
}

type SharedApprovalDescriptionProps = {
  tradeQuoteStep: TradeQuoteStep
  isError: boolean
  txHash: string | undefined
  approvalNetworkFeeCryptoFormatted: string | undefined
  errorTranslation: string
  gasFeeLoadingTranslation: string
  gasFeeTranslation: string
  isAwaitingReset?: boolean
  isLoadingNetworkFee?: boolean
}

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
  const errorMsg = isError ? (
    <Text color='text.error' translation={errorTranslation} fontWeight='bold' />
  ) : null

  if (!txHash) {
    return (
      <>
        {errorMsg}
        {isLoadingNetworkFee
          ? translate(gasFeeLoadingTranslation)
          : translate(gasFeeTranslation, {
              fee: approvalNetworkFeeCryptoFormatted ?? '',
            })}
      </>
    )
  }

  const href = `${tradeQuoteStep.sellAsset.explorerTxLink}${txHash}`

  return (
    <>
      {errorMsg}
      <Link isExternal href={href} color='text.link'>
        <MiddleEllipsis value={txHash} />
      </Link>
    </>
  )
}
