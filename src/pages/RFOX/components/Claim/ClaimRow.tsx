import { useMediaQuery } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ClaimRow as ReusableClaimRow } from 'components/ClaimRow/ClaimRow'
import { ClaimStatus } from 'components/ClaimRow/types'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import type { RfoxClaimQuote } from './types'

type ClaimRowProps = {
  stakingAssetId: AssetId
  amountCryptoBaseUnit: string
  status: ClaimStatus
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
  cooldownPeriodHuman: string
  index: number
  onClaimClick?: () => void
}

export const ClaimRow: FC<ClaimRowProps> = ({
  stakingAssetId,
  amountCryptoBaseUnit,
  status,
  setConfirmedQuote,
  cooldownPeriodHuman,
  index,
  onClaimClick,
}) => {
  const translate = useTranslate()
  const { stakingAssetAccountId } = useRFOXContext()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)

  console.log('ClaimRow', { stakingAssetAccountId })

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const amountCryptoPrecision = fromBaseUnit(
    bnOrZero(amountCryptoBaseUnit),
    stakingAsset?.precision ?? 0,
  )

  const handleClaimClick = useMemo(() => {
    if (!stakingAssetAccountId || onClaimClick === undefined) return

    return () => {
      const claimQuote: RfoxClaimQuote = {
        stakingAssetAccountId,
        stakingAssetId,
        stakingAmountCryptoBaseUnit: amountCryptoBaseUnit,
        index,
      }

      setConfirmedQuote(claimQuote)
      onClaimClick()
    }
  }, [
    amountCryptoBaseUnit,
    index,
    onClaimClick,
    setConfirmedQuote,
    stakingAssetAccountId,
    stakingAssetId,
  ])

  const statusText = useMemo(() => {
    if (!isLargerThanMd) return cooldownPeriodHuman

    if (status === ClaimStatus.Pending) {
      return translate('RFOX.tooltips.unstakePendingCooldown', { cooldownPeriodHuman })
    }

    return translate('RFOX.tooltips.cooldownComplete', { cooldownPeriodHuman })
  }, [cooldownPeriodHuman, isLargerThanMd, status, translate])

  const actionText = useMemo(() => {
    if (!stakingAsset?.symbol) return

    return translate('RFOX.claim', { stakingAssetSymbol: stakingAsset.symbol })
  }, [stakingAsset, translate])

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
