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
} & (
  | {
      displayClaimButton: boolean
      actionDescription: string
    }
  | {
      displayClaimButton?: never
      actionDescription?: never
    }
)

const hoverProps = { bg: 'gray.700' }

export const ClaimRow: FC<ClaimRowProps> = ({
  stakingAssetId,
  amountCryptoPrecision,
  status,
  setConfirmedQuote,
  cooldownPeriodHuman,
  index,
  displayClaimButton,
  actionDescription,
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const isClaimWidget = useMemo(
    () => history.location.pathname.includes('/claim/'),
    [history.location.pathname],
  )
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
    // We use this component in two places:
    // 1. In dashboard `<Claims />`, where there is no widget `<ClaimRoutes />` memory router
    // 2. In `<ClaimRoutes />`, where there *is* a memory router
    // Trying to history.push in the first case will result in an invalid route, since there is no ClaimRoutePaths context in <Claims />
    if (!isClaimWidget) return
    history.push(ClaimRoutePaths.Confirm)
  }, [
    history,
    index,
    isClaimWidget,
    setConfirmedQuote,
    stakingAmountCryptoBaseUnit,
    stakingAssetAccountId,
  ])

  const parentProps = useMemo(() => {
    if (displayClaimButton) return {}

    return {
      variant: 'unstyled',
      as: Button,
      isDisabled: status !== ClaimStatus.Available,
      onClick: handleClaimClick,
      _hover: hoverProps,
    }
  }, [displayClaimButton, status, handleClaimClick])

  const statusText = useMemo(() => {
    if (!isLargerThanMd) return cooldownPeriodHuman

    if (status === ClaimStatus.CoolingDown)
      return translate('RFOX.tooltips.unstakePendingCooldown', { cooldownPeriodHuman })
    return translate('RFOX.tooltips.cooldownComplete', { cooldownPeriodHuman })
  }, [cooldownPeriodHuman, isLargerThanMd, status, translate])

  const actionTranslation = useMemo(() => {
    if (!stakingAssetSymbol) return

    return [displayClaimButton ? actionDescription : 'RFOX.claim', { stakingAssetSymbol }]
  }, [displayClaimButton, actionDescription, stakingAssetSymbol])

  return (
    <Tooltip
      label={translate(
        status === ClaimStatus.Available
          ? 'RFOX.tooltips.cooldownComplete'
          : 'RFOX.tooltips.unstakePendingCooldown',
        { cooldownPeriodHuman },
      )}
      isDisabled={displayClaimButton}
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
            {actionTranslation && (
              <RawText fontSize='sm' color='gray.400' align={'start'}>
                {translate(...actionTranslation)}
              </RawText>
            )}
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
              {statusText}
            </RawText>
            <RawText fontSize='xl' fontWeight='bold' color='white' align={'end'}>
              <Amount.Crypto value={amountCryptoPrecision} symbol={stakingAssetSymbol ?? ''} />
            </RawText>
          </Box>
          {displayClaimButton && (
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
