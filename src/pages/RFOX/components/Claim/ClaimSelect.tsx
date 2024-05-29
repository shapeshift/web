import { Box, Button, CardBody, Flex, Stack } from '@chakra-ui/react'
import { type AssetId, foxAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import { toBaseUnit } from 'lib/math'
import { selectAssetById, selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxClaimQuote } from './types'
import { ClaimRoutePaths, type ClaimRouteProps } from './types'

type ClaimRowProps = {
  stakingAssetId: AssetId
  amountCryptoPrecision: string
  status: string
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
}

const hoverProps = { bg: 'gray.700' }

const ClaimRow: FC<ClaimRowProps> = ({
  stakingAssetId: assetId,
  amountCryptoPrecision,
  status,
  setConfirmedQuote,
}) => {
  const translate = useTranslate()
  const history = useHistory()

  const stakingAsset = useAppSelector(state => selectAssetById(state, assetId))
  const stakingAssetSymbol = stakingAsset?.symbol
  const stakingAmountCryptoBaseUnit = toBaseUnit(
    bnOrZero(amountCryptoPrecision),
    stakingAsset?.precision ?? 0,
  )

  // TODO(apotheosis): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )

  const claimQuote: RfoxClaimQuote = useMemo(
    () => ({
      claimAssetAccountId: stakingAssetAccountId ?? '',
      claimAssetId: assetId,
      claimAmountCryptoBaseUnit: stakingAmountCryptoBaseUnit,
    }),
    [assetId, stakingAmountCryptoBaseUnit, stakingAssetAccountId],
  )

  const handleClick = useCallback(() => {
    setConfirmedQuote(claimQuote)
    history.push(ClaimRoutePaths.Confirm)
  }, [claimQuote, history, setConfirmedQuote])

  return (
    <Flex
      as={Button}
      align='center'
      variant='unstyled'
      p={8}
      borderRadius='md'
      width='100%'
      onClick={handleClick}
      _hover={hoverProps}
    >
      <Box mr={4}>
        <AssetIconWithBadge assetId={foxAssetId}>
          <TransactionTypeIcon type={TransferType.Receive} />
        </AssetIconWithBadge>
      </Box>
      <Box mr={4}>
        <RawText fontSize='sm' color='gray.400' align={'start'}>
          {translate('RFOX.unstakeFrom', { assetSymbol: stakingAssetSymbol })}
        </RawText>
        <RawText fontSize='xl' fontWeight='bold' color='white' align={'start'}>
          {stakingAssetSymbol}
        </RawText>
      </Box>
      <Box flex='1' alignItems={'end'}>
        <RawText fontSize='sm' fontWeight='bold' color='green.300' align={'end'}>
          {status}
        </RawText>
        <RawText fontSize='xl' fontWeight='bold' color='white' align={'end'}>
          <Amount.Crypto value={amountCryptoPrecision} symbol={stakingAssetSymbol ?? ''} />
        </RawText>
      </Box>
    </Flex>
  )
}

type ClaimSelectProps = {
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
}

export const ClaimSelect: FC<ClaimSelectProps & ClaimRouteProps> = ({
  headerComponent,
  setConfirmedQuote,
}) => {
  return (
    <SlideTransition>
      <Stack>{headerComponent}</Stack>
      <CardBody py={12}>
        <Flex flexDir='column' gap={4}>
          <ClaimRow
            stakingAssetId={foxAssetId}
            amountCryptoPrecision={'1500'}
            status={'Available'}
            setConfirmedQuote={setConfirmedQuote}
          />
          <ClaimRow
            stakingAssetId={foxAssetId}
            amountCryptoPrecision={'200'}
            status={'Available'}
            setConfirmedQuote={setConfirmedQuote}
          />
        </Flex>
      </CardBody>
    </SlideTransition>
  )
}
