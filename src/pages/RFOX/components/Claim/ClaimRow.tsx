import { useMediaQuery } from '@chakra-ui/react'
import { type AssetId, foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { type FC, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ClaimRow as ReusableClaimRow } from 'components/ClaimRow/ClaimRow'
import { ClaimStatus } from 'components/ClaimRow/types'
import { toBaseUnit } from 'lib/math'
import { selectAssetById, selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { type RfoxClaimQuote } from './types'

type ClaimRowProps = {
  stakingAssetId: AssetId
  amountCryptoPrecision: string
  status: ClaimStatus
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
  cooldownPeriodHuman: string
  index: number
  onClaimClick?: () => void
}

export const ClaimRow: FC<ClaimRowProps> = ({
  stakingAssetId,
  amountCryptoPrecision,
  status,
  setConfirmedQuote,
  cooldownPeriodHuman,
  index,
  onClaimClick,
}) => {
  const translate = useTranslate()
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

  const handleClaimClick = useMemo(() => {
    if (!stakingAssetAccountId || onClaimClick === undefined) return
    return () => {
      const claimQuote: RfoxClaimQuote = {
        stakingAssetAccountId,
        stakingAssetId: foxOnArbitrumOneAssetId,
        stakingAmountCryptoBaseUnit,
        index,
      }
      setConfirmedQuote(claimQuote)
      onClaimClick()
    }
  }, [index, onClaimClick, setConfirmedQuote, stakingAmountCryptoBaseUnit, stakingAssetAccountId])

  const statusText = useMemo(() => {
    if (!isLargerThanMd) return cooldownPeriodHuman

    if (status === ClaimStatus.Pending)
      return translate('RFOX.tooltips.unstakePendingCooldown', { cooldownPeriodHuman })
    return translate('RFOX.tooltips.cooldownComplete', { cooldownPeriodHuman })
  }, [cooldownPeriodHuman, isLargerThanMd, status, translate])

  const actionText = useMemo(() => {
    if (!stakingAssetSymbol) return

    return translate('RFOX.claim', { stakingAssetSymbol })
  }, [stakingAssetSymbol, translate])

  if (!stakingAsset) return null

  return (
    <ReusableClaimRow
      amountCryptoPrecision={amountCryptoPrecision}
      onClaimClick={handleClaimClick}
      asset={stakingAsset}
      actionText={actionText}
      statusText={statusText}
      status={status}
    />
  )
}
