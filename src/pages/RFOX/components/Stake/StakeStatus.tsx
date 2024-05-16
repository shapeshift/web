import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Center, Heading, Link, Stack } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { RfoxStakingQuote } from './types'
import { StakeRoutePaths, type StakeRouteProps } from './types'

type BodyContent = {
  key: TxStatus
  title: string
  body: TextPropTypes['translation']
  element: JSX.Element
}

type StakeStatusProps = {
  confirmedQuote: RfoxStakingQuote
  txId: string
}
export const StakeStatus: React.FC<StakeRouteProps & StakeStatusProps> = ({
  confirmedQuote,
  txId,
}) => {
  const history = useHistory()
  const translate = useTranslate()

  const handleGoBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(confirmedQuote.stakingAssetAccountId).account,
    [confirmedQuote.stakingAssetAccountId],
  )
  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const stakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.stakingAmountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [confirmedQuote.stakingAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const serializedApprovalTxIndex = useMemo(() => {
    return serializeTxIndex(confirmedQuote.stakingAssetAccountId, txId, stakingAssetAccountAddress)
  }, [txId, confirmedQuote.stakingAssetAccountId, stakingAssetAccountAddress])

  const approvalTx = useAppSelector(state => selectTxById(state, serializedApprovalTxIndex))

  const bodyContent: BodyContent | null = useMemo(() => {
    if (!stakingAsset) return null

    switch (approvalTx?.status) {
      case undefined:
      case TxStatus.Pending:
        return {
          key: TxStatus.Pending,
          title: 'pools.waitingForConfirmation',
          body: [
            'RFOX.stakePending',
            { amount: stakingAmountCryptoPrecision, symbol: stakingAsset.symbol },
          ],
          element: <CircularProgress size='75px' />,
        }
      case TxStatus.Confirmed:
        return {
          key: TxStatus.Confirmed,
          title: 'common.success',
          body: [
            'RFOX.stakeSuccess',
            { amount: stakingAmountCryptoPrecision, symbol: stakingAsset.symbol },
          ],
          element: <CheckCircleIcon color='text.success' boxSize='75px' />,
        }
      case TxStatus.Failed:
        return {
          key: TxStatus.Failed,
          title: 'common.somethingWentWrong',
          body: 'Show error message here',
          element: <WarningIcon color='text.error' boxSize='75px' />,
        }
      default:
        return null
    }
  }, [approvalTx.status, stakingAmountCryptoPrecision, stakingAsset])

  const txLink = useMemo(
    () => getTxLink({ txId, defaultExplorerBaseUrl: stakingAsset?.explorerTxLink ?? '' }),
    [stakingAsset?.explorerTxLink, txId],
  )

  return (
    <SlideTransition>
      {bodyContent && (
        <AnimatePresence mode='wait'>
          <SlideTransitionY key={bodyContent.key}>
            <CardBody py={12}>
              <Center flexDir='column' gap={4}>
                {bodyContent.element}
                <Stack spacing={0} alignItems='center'>
                  <Heading as='h4'>{translate(bodyContent.title)}</Heading>
                  <Text translation={bodyContent.body} />
                </Stack>
              </Center>
            </CardBody>
          </SlideTransitionY>
        </AnimatePresence>
      )}
      <CardFooter flexDir='column' gap={2}>
        <Button as={Link} href={txLink} size='lg' variant='ghost'>
          {translate('trade.viewTransaction')}
        </Button>
        <Button size='lg' colorScheme='blue' onClick={handleGoBack}>
          {translate('common.goBack')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
