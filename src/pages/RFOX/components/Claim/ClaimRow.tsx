import { Box, Button, Flex, Tooltip, useMediaQuery } from '@chakra-ui/react'
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
import { breakpoints } from 'theme/theme'

import { ClaimRoutePaths, ClaimStatus, type RfoxClaimQuote } from './types'

type ClaimRowProps = {
  stakingAssetId: AssetId
  amountCryptoPrecision: string
  status: ClaimStatus
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
  cooldownPeriodHuman: string
  index: number
  displayButton?: boolean
  text?: string
}

const hoverProps = { bg: 'gray.700' }

export const ClaimRow: FC<ClaimRowProps> = ({
  stakingAssetId,
  amountCryptoPrecision,
  status,
  setConfirmedQuote,
  cooldownPeriodHuman,
  index,
  displayButton,
  text,
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const stakingAssetSymbol = stakingAsset?.symbol
  const stakingAmountCryptoBaseUnit = toBaseUnit(
    bnOrZero(amountCryptoPrecision),
    stakingAsset?.precision ?? 0,
  )

  // TODO(apotheosis): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )

  const handleClaimClick = useCallback(() => {
    if (!stakingAssetAccountId) return
    const claimQuote: RfoxClaimQuote = {
      stakingAssetAccountId,
      stakingAssetId: foxOnArbitrumOneAssetId,
      stakingAmountCryptoBaseUnit,
      index,
    }
    setConfirmedQuote(claimQuote)
    history.push(ClaimRoutePaths.Confirm)
  }, [history, index, setConfirmedQuote, stakingAmountCryptoBaseUnit, stakingAssetAccountId])

  const parentProps = useMemo(() => {
    if (displayButton) return {}

    return {
      variant: 'unstyled',
      as: Button,
      isDisabled: status !== ClaimStatus.Available,
      onClick: handleClaimClick,
      _hover: hoverProps,
    }
  }, [displayButton, status, handleClaimClick])

  const statusTest = useMemo(() => {
    if (displayButton && status === ClaimStatus.CoolingDown && !isLargerThanMd)
      return cooldownPeriodHuman
    if (displayButton && status === ClaimStatus.CoolingDown)
      return translate('RFOX.tooltips.unstakePendingCooldown', { cooldownPeriodHuman })
    return status
  }, [cooldownPeriodHuman, isLargerThanMd, displayButton, status, translate])

  return (
    <Tooltip
      label={translate(
        status === ClaimStatus.Available
          ? 'RFOX.tooltips.cooldownComplete'
          : 'RFOX.tooltips.unstakePendingCooldown',
        { cooldownPeriodHuman },
      )}
      isDisabled={displayButton}
    >
      <Flex
        justifyContent={'space-between'}
        align='center'
        p={2}
        borderRadius='md'
        height='auto'
        width='100%'
        {...parentProps}
      >
        <Flex>
          <Flex alignItems='center' mr={4}>
            <AssetIconWithBadge assetId={foxAssetId}>
              <TransactionTypeIcon type={TransferType.Receive} />
            </AssetIconWithBadge>
          </Flex>
          <Box mr={4}>
            <RawText fontSize='sm' color='gray.400' align={'start'}>
              {text ? text : translate('RFOX.claim', { assetSymbol: stakingAssetSymbol })}
            </RawText>
            <RawText fontSize='xl' fontWeight='bold' color='white' align={'start'}>
              {stakingAssetSymbol}
            </RawText>
          </Box>
        </Flex>
        <Flex justifyContent={'flex-end'} alignItems='center'>
          <Box flexGrow={1} alignItems={'end'}>
            <RawText
              fontSize='sm'
              fontWeight='bold'
              color={status === ClaimStatus.Available ? 'green.300' : 'yellow.300'}
              align={'end'}
            >
              {statusTest}
            </RawText>
            <RawText fontSize='xl' fontWeight='bold' color='white' align={'end'}>
              <Amount.Crypto value={amountCryptoPrecision} symbol={stakingAssetSymbol ?? ''} />
            </RawText>
          </Box>
          {displayButton && (
            <Button
              colorScheme='green'
              ml={4}
              isDisabled={status === ClaimStatus.CoolingDown ? true : false}
            >
              {translate('RFOX.claim')}
            </Button>
          )}
        </Flex>
      </Flex>
    </Tooltip>
  )
}
