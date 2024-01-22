import { Stack } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { AsymSide, type ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ReusableLpStatus } from '../ReusableLpStatus/ReusableLpStatus'
import { TransactionRow } from '../ReusableLpStatus/TransactionRow'
import { AddLiquidityRoutePaths } from './types'

type AddLiquidityStatusProps = {
  confirmedQuote: ConfirmedQuote
}

export const AddLiquidityStatus = ({ confirmedQuote }: AddLiquidityStatusProps) => {
  const history = useHistory()
  const [activeStep, setActiveStep] = useState(0)

  const { opportunityId } = confirmedQuote

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const assets: Asset[] = useMemo(() => {
    if (!(foundPool && asset && rune)) return []

    if (foundPool.asymSide === null) return [rune, asset]
    if (foundPool.asymSide === AsymSide.Rune) return [rune]
    if (foundPool.asymSide === AsymSide.Asset) return [asset]

    throw new Error('Invalid asym side')
  }, [asset, foundPool, rune])

  const handleGoBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const handleComplete = useCallback(() => {
    setActiveStep(activeStep + 1)
  }, [activeStep])

  const isComplete = useMemo(() => {
    return activeStep === assets.length
  }, [activeStep, assets.length])

  const assetCards = useMemo(() => {
    return (
      <Stack mt={4}>
        {assets.map((asset, index) => {
          const amountCryptoPrecision =
            asset.assetId === thorchainAssetId
              ? confirmedQuote.runeCryptoLiquidityAmount
              : confirmedQuote.assetCryptoLiquidityAmount
          return (
            <TransactionRow
              key={asset.assetId}
              assetId={asset.assetId}
              amountCryptoPrecision={amountCryptoPrecision}
              onComplete={handleComplete}
              isActive={index === activeStep}
            />
          )
        })}
      </Stack>
    )
  }, [
    assets,
    confirmedQuote.runeCryptoLiquidityAmount,
    confirmedQuote.assetCryptoLiquidityAmount,
    handleComplete,
    activeStep,
  ])

  if (!foundPool) return null

  return (
    <ReusableLpStatus
      pool={foundPool}
      confirmedQuote={confirmedQuote}
      baseAssetId={thorchainAssetId}
      handleBack={handleGoBack}
      isComplete={isComplete}
    >
      {assetCards}
    </ReusableLpStatus>
  )
}
