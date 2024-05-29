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
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxClaimQuote } from './ClaimConfirm'
import { ClaimRoutePaths, type ClaimRouteProps } from './types'

type ClaimRowProps = {
  assetId: AssetId
  amount: string
  status: string
  setClaimQuote: (quote: RfoxClaimQuote) => void
}

const hoverProps = { bg: 'gray.700' }

const ClaimRow: FC<ClaimRowProps> = ({ assetId, amount, status, setClaimQuote }) => {
  const translate = useTranslate()
  const history = useHistory()

  const claimAsset = useAppSelector(state => selectAssetById(state, assetId))
  const assetSymbol = claimAsset?.symbol
  const claimAmountCryptoBaseUnit = toBaseUnit(bnOrZero(amount), claimAsset?.precision ?? 0)

  const claimQuote: RfoxClaimQuote = useMemo(
    () => ({
      claimAssetAccountId: '1234',
      claimAssetId: assetId,
      claimAmountCryptoBaseUnit,
    }),
    [assetId, claimAmountCryptoBaseUnit],
  )

  const handleClick = useCallback(() => {
    console.log('ClaimRow clicked')
    setClaimQuote(claimQuote)
    history.push(ClaimRoutePaths.Confirm)
  }, [claimQuote, history, setClaimQuote])

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
          {translate('RFOX.unstakeFrom', { assetSymbol })}
        </RawText>
        <RawText fontSize='xl' fontWeight='bold' color='white' align={'start'}>
          {assetSymbol}
        </RawText>
      </Box>
      <Box flex='1' alignItems={'end'}>
        <RawText fontSize='sm' fontWeight='bold' color='green.300' align={'end'}>
          {status}
        </RawText>
        <RawText fontSize='xl' fontWeight='bold' color='white' align={'end'}>
          <Amount.Crypto value={amount} symbol={assetSymbol ?? ''} />
        </RawText>
      </Box>
    </Flex>
  )
}

type ClaimSelectProps = {
  setClaimQuote: (quote: RfoxClaimQuote) => void
}

export const ClaimSelect: FC<ClaimSelectProps & ClaimRouteProps> = ({
  headerComponent,
  setClaimQuote,
}) => {
  return (
    <SlideTransition>
      <Stack>{headerComponent}</Stack>
      <CardBody py={12}>
        <Flex flexDir='column' gap={4}>
          <ClaimRow
            assetId={foxAssetId}
            amount={'1500'}
            status={'Available'}
            setClaimQuote={setClaimQuote}
          />
          <ClaimRow
            assetId={foxAssetId}
            amount={'200'}
            status={'Available'}
            setClaimQuote={setClaimQuote}
          />
        </Flex>
      </CardBody>
    </SlideTransition>
  )
}
