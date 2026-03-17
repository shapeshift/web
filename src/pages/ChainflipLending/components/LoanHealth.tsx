import { Card, CardBody, Flex, Icon, Stack, Text as CText } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { TbHeartRateMonitor } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { useChainflipLtvThresholds } from '@/pages/ChainflipLending/hooks/useChainflipLtvThresholds'
import { LtvGauge } from '@/pages/ChainflipLending/Pool/components/Borrow/LtvGauge'

const DEFAULT_HARD_LIQUIDATION_LTV = 0.93

const getLtvColor = (ltv: number, riskyThreshold: number, hardLiqThreshold: number): string => {
  if (ltv >= hardLiqThreshold) return 'red.500'
  if (ltv >= riskyThreshold) return 'yellow.500'
  return 'green.500'
}

export const LoanHealth = memo(() => {
  const translate = useTranslate()
  const { totalCollateralFiat, totalBorrowedFiat } = useChainflipLoanAccount()
  const { thresholds } = useChainflipLtvThresholds()

  const hasLoans = useMemo(() => bnOrZero(totalBorrowedFiat).gt(0), [totalBorrowedFiat])

  const currentLtv = useMemo(() => {
    if (bnOrZero(totalCollateralFiat).isZero()) return 0
    return bnOrZero(totalBorrowedFiat).div(totalCollateralFiat).toNumber()
  }, [totalBorrowedFiat, totalCollateralFiat])

  const hardLiquidationLtv = thresholds?.hardLiquidation ?? DEFAULT_HARD_LIQUIDATION_LTV
  const riskyLtv = thresholds?.target ?? 0.8

  const liquidationDistance = useMemo(() => {
    if (hardLiquidationLtv === 0) return '0'
    const liquidationCollateral = bnOrZero(totalBorrowedFiat).div(hardLiquidationLtv)
    return bnOrZero(totalCollateralFiat).minus(liquidationCollateral).toFixed(2)
  }, [totalCollateralFiat, totalBorrowedFiat, hardLiquidationLtv])

  const ltvColor = useMemo(
    () => getLtvColor(currentLtv, riskyLtv, hardLiquidationLtv),
    [currentLtv, riskyLtv, hardLiquidationLtv],
  )

  const ltvDisplayPercent = useMemo(
    () => (Math.min(Math.max(currentLtv, 0), 1) * 100).toFixed(1),
    [currentLtv],
  )

  if (!hasLoans) return null

  return (
    <Card>
      <CardBody>
        <Stack spacing={4}>
          {/* Header row: left = icon + label + current LTV, right = liquidation distance */}
          <Flex
            justifyContent='space-between'
            alignItems={{ base: 'flex-start', md: 'center' }}
            flexDirection={{ base: 'column', md: 'row' }}
            gap={2}
          >
            <Flex alignItems='center' gap={2}>
              <Icon as={TbHeartRateMonitor} boxSize='20px' color='text.subtle' />
              <HelperTooltip label={translate('chainflipLending.dashboard.loanHealthTooltip')}>
                <Text
                  translation='chainflipLending.dashboard.loanHealth'
                  fontWeight='bold'
                  fontSize='md'
                />
              </HelperTooltip>
              <CText fontSize='sm' fontWeight='semibold' color={ltvColor}>
                {translate('chainflipLending.dashboard.currentLtv', {
                  ltv: `${ltvDisplayPercent}%`,
                })}
              </CText>
            </Flex>
            <Flex alignItems='center' gap={2}>
              <Text
                translation='chainflipLending.dashboard.liquidationDistance'
                fontSize='sm'
                color='text.subtle'
              />
              <Amount.Fiat
                value={liquidationDistance}
                fontSize='sm'
                fontWeight='bold'
                color={bnOrZero(liquidationDistance).gt(0) ? 'green.500' : 'red.500'}
              />
            </Flex>
          </Flex>

          {/* Multi-segment LTV gauge bar */}
          <LtvGauge currentLtv={currentLtv} />
        </Stack>
      </CardBody>
    </Card>
  )
})
