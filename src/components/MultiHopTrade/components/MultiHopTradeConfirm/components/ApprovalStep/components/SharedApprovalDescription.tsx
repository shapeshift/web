import { Box, Link } from '@chakra-ui/react'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { getTxLink } from 'lib/getTxLink'
import { selectFirstHopSellAccountId } from 'state/slices/tradeInputSlice/selectors'
import { useAppSelector } from 'state/store'

export type TxLineProps = {
  tradeQuoteStep: TradeQuoteStep
  nameTranslation: string
  txHash: string
}

const TxLine = ({ nameTranslation, tradeQuoteStep, txHash }: TxLineProps) => {
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
    <Box display='flex' alignItems='center' whiteSpace='nowrap'>
      {nameTranslation && <Text translation={nameTranslation} color='text.subtle' mr={2} />}
      {txLink && (
        <Link isExternal href={txLink} color='text.link'>
          <MiddleEllipsis value={maybeSafeTx?.transaction?.transactionHash ?? txHash} />
        </Link>
      )}
    </Box>
  )
}

type SharedApprovalDescriptionProps = {
  tradeQuoteStep: TradeQuoteStep
  txLines: Omit<TxLineProps, 'tradeQuoteStep'>[]
  isError: boolean
  errorTranslation: string
  children?: JSX.Element | null
}

export const SharedApprovalDescription = ({
  tradeQuoteStep,
  isError,
  txLines,
  errorTranslation,
  children,
}: SharedApprovalDescriptionProps) => {
  return (
    <>
      {isError && <Text color='text.error' translation={errorTranslation} fontWeight='bold' />}

      {txLines.length > 0
        ? txLines.map(({ txHash, nameTranslation }) => (
            <TxLine
              key={txHash}
              txHash={txHash}
              nameTranslation={nameTranslation}
              tradeQuoteStep={tradeQuoteStep}
            />
          ))
        : null}

      {children}
    </>
  )
}
