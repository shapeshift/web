import { Box, Button, Flex, Tooltip } from '@chakra-ui/react'
import { type AssetId, foxAssetId, foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { RawText } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import { toBaseUnit } from 'lib/math'
import { selectAssetById, selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRoutePaths, ClaimStatus, type RfoxClaimQuote } from './types'

type ClaimRowProps = {
  amountCryptoPrecision: string
  status: ClaimStatus
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
  cooldownPeriodHuman: string
  index: number
}

const hoverProps = { bg: 'gray.700' }

export const ClaimRow: FC<ClaimRowProps> = ({
  amountCryptoPrecision,
  status,
  setConfirmedQuote,
  cooldownPeriodHuman,
  index,
}) => {
  const translate = useTranslate()
  const history = useHistory()

  const stakingAsset = useAppSelector(state => selectAssetById(state, foxOnArbitrumOneAssetId))
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
      claimAssetId: foxOnArbitrumOneAssetId,
      claimAmountCryptoBaseUnit: stakingAmountCryptoBaseUnit,
      index,
    }),
    [index, stakingAmountCryptoBaseUnit, stakingAssetAccountId],
  )

  const handleClaimClick = useCallback(() => {
    setConfirmedQuote(claimQuote)
    history.push(ClaimRoutePaths.Confirm)
  }, [claimQuote, history, setConfirmedQuote])

  return (
    <Tooltip
      label={translate(
        status === ClaimStatus.Available
          ? 'RFOX.tooltips.cooldownComplete'
          : 'RFOX.tooltips.unstakePendingCooldown',
        { cooldownPeriodHuman },
      )}
    >
      <Flex
        as={Button}
        justifyContent={'space-between'}
        mt={2}
        align='center'
        variant='unstyled'
        p={8}
        borderRadius='md'
        width='100%'
        onClick={handleClaimClick}
        isDisabled={status !== ClaimStatus.Available}
        _hover={hoverProps}
      >
        <Flex>
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
        </Flex>
        <Flex justifyContent={'flex-end'}>
          <Box flexGrow={1} alignItems={'end'}>
            <RawText
              fontSize='sm'
              fontWeight='bold'
              color={status === ClaimStatus.Available ? 'green.300' : 'yellow.300'}
              align={'end'}
            >
              {status}
            </RawText>
            <RawText fontSize='xl' fontWeight='bold' color='white' align={'end'}>
              <Amount.Crypto value={amountCryptoPrecision} symbol={stakingAssetSymbol ?? ''} />
            </RawText>
          </Box>
        </Flex>
      </Flex>
    </Tooltip>
  )
}
