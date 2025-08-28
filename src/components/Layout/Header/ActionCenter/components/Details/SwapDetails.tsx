import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, ButtonGroup, Link, Stack } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import React from 'react'
import { useTranslate } from 'react-polyglot'

import { StreamingSwapDetails } from './StreamingSwapDetails'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { TxLabel } from '@/components/MultiHopTrade/components/TradeConfirm/TxLabel'
import { Row } from '@/components/Row/Row'
import type { SwapAction } from '@/state/slices/actionSlice/types'

type SwapDetailsProps = {
  txLink?: string
  swap: Swap
  action: SwapAction
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ txLink, action, swap }) => {
  const translate = useTranslate()
  const { sellAsset, sellAccountId, isStreaming, swapperName, sellTxHash, buyTxHash } = swap
  const { swapMetadata } = action

  const txHash = buyTxHash || sellTxHash

  if (swapMetadata?.isPermit2Required || swapMetadata?.allowanceApproval?.txHash) {
    return (
      <Stack gap={4}>
        <Row fontSize='sm' alignItems='center'>
          <Row.Label>
            {translate(
              swapMetadata?.isPermit2Required ? 'common.permit2Approval' : 'common.approval',
            )}
          </Row.Label>
          <Row.Value>
            {swapMetadata.allowanceApproval?.txHash ? (
              <TxLabel
                txHash={swapMetadata.allowanceApproval.txHash}
                explorerBaseUrl={sellAsset.explorerTxLink}
                accountId={sellAccountId}
                stepSource={undefined} // no swapper base URL here, this is an allowance Tx
                quoteSwapperName={swapperName}
              />
            ) : (
              <CheckCircleIcon color='green.500' />
            )}
          </Row.Value>
        </Row>
        {txHash && (
          <Row fontSize='sm' alignItems='center'>
            <Row.Label>{translate('trade.hopTitle.swap', { swapperName })}</Row.Label>
            <Row.Value>
              {txLink ? (
                <Link isExternal href={txLink} color='text.link'>
                  <MiddleEllipsis value={txHash} />
                </Link>
              ) : (
                <MiddleEllipsis value={txHash} />
              )}
            </Row.Value>
          </Row>
        )}
      </Stack>
    )
  }

  return (
    <Stack gap={4}>
      {isStreaming && <StreamingSwapDetails swap={swap} />}
      {txLink && (
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('actionCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      )}
    </Stack>
  )
}
