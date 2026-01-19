import { AddIcon } from '@chakra-ui/icons'
import { Alert, Box, Button, Flex, Text } from '@chakra-ui/react'
import qs from 'qs'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const addIcon = <AddIcon />

type YieldAddMoreProps = {
  yieldItem: AugmentedYieldDto
  inputTokenMarketData: { price?: string } | undefined
  hasPosition?: boolean
}

export const YieldAddMore = memo(
  ({ yieldItem, inputTokenMarketData, hasPosition }: YieldAddMoreProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const { location } = useBrowserRouter()

    const inputToken = yieldItem.inputTokens[0]
    const inputTokenAssetId = inputToken?.assetId ?? ''
    const inputTokenPrecision = inputToken?.decimals

    const availableBalanceBaseUnit = useAppSelector(state =>
      selectPortfolioCryptoBalanceBaseUnitByFilter(state, { assetId: inputTokenAssetId }),
    )

    const availableBalance = useMemo(
      () =>
        inputTokenPrecision
          ? bnOrZero(availableBalanceBaseUnit).shiftedBy(-inputTokenPrecision)
          : bnOrZero(0),
      [availableBalanceBaseUnit, inputTokenPrecision],
    )

    const availableBalanceFiat = useMemo(
      () => availableBalance.times(bnOrZero(inputTokenMarketData?.price)),
      [availableBalance, inputTokenMarketData?.price],
    )

    const potentialYearlyEarningsFiat = useMemo(
      () => availableBalanceFiat.times(yieldItem.rewardRate.total),
      [availableBalanceFiat, yieldItem.rewardRate.total],
    )

    const hasAvailableBalance = availableBalance.gt(0)

    const handleEnter = useCallback(() => {
      navigate({
        pathname: location.pathname,
        search: qs.stringify({ action: 'enter', modal: 'yield' }),
      })
    }, [navigate, location.pathname])

    // Only show when user has a position AND has available balance to add
    if (!hasPosition || !hasAvailableBalance || !inputTokenPrecision) return null

    return (
      <Alert
        status='success'
        bg='background.surface.raised.base'
        borderRadius='xl'
        variant='subtle'
        py={3}
        px={4}
        boxShadow='0 1px 0 var(--chakra-colors-border-bold) inset, 0 0 0 1px var(--chakra-colors-border-base) inset'
      >
        <Box
          position='absolute'
          width='100%'
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={0}
          transform='scale(1)'
          filter='blur(50px)'
          opacity={0.3}
          _dark={{ opacity: 0.3 }}
          bgGradient='linear(to-bl, green.500, blackAlpha.500)'
        />
        <Flex width='full' justify='space-between' align='center' gap={4} zIndex={1}>
          <Flex direction='column' gap={0.5}>
            <Text fontSize='lg' fontWeight='medium'>
              {translate('yieldXYZ.availableToAdd', {
                amount: availableBalance.toFixed(),
                symbol: yieldItem.token.symbol,
              })}
            </Text>
            {potentialYearlyEarningsFiat.gt(0) && (
              <Text fontSize='xs' color='text.subtle'>
                {translate('yieldXYZ.earnUpTo')}{' '}
                <Amount.Fiat
                  as='span'
                  color='text.success'
                  fontWeight='semibold'
                  value={potentialYearlyEarningsFiat.toFixed()}
                  suffix='/yr'
                />
              </Text>
            )}
          </Flex>
          <Button
            size='sm'
            colorScheme='green'
            leftIcon={addIcon}
            onClick={handleEnter}
            flexShrink={0}
          >
            {translate('yieldXYZ.addMore')}
          </Button>
        </Flex>
      </Alert>
    )
  },
)
