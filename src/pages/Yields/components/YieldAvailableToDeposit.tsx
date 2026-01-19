import { InfoOutlineIcon } from '@chakra-ui/icons'
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
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

type YieldAvailableToDepositProps = {
  yieldItem: AugmentedYieldDto
  inputTokenMarketData: { price?: string } | undefined
  hasPosition?: boolean
}

export const YieldAvailableToDeposit = memo(
  ({ yieldItem, inputTokenMarketData, hasPosition }: YieldAvailableToDepositProps) => {
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

    if (!inputTokenPrecision) return null

    const tooltipLabel = translate('yieldXYZ.availableToDepositTooltip', {
      symbol: yieldItem.token.symbol,
    })

    if (!hasAvailableBalance || hasPosition) return null

    return (
      <Card colorScheme='green'>
        <Box
          bgGradient='linear(to-bl, green.500, blackAlpha.500)'
          position='absolute'
          top={0}
          left={0}
          right={0}
          bottom={0}
          opacity={0.1}
          zIndex={0}
          borderRadius='xl'
        />
        <CardBody p={{ base: 4, md: 5 }} zIndex={1}>
          <VStack spacing={4} align='stretch'>
            <Flex justifyContent='space-between' alignItems='center'>
              <HStack spacing={2}>
                <Heading as='h3' size='sm'>
                  {translate('yieldXYZ.availableToDeposit')}
                </Heading>
                <Tooltip label={tooltipLabel} placement='top'>
                  <InfoOutlineIcon color='text.subtle' boxSize={3} cursor='help' />
                </Tooltip>
              </HStack>
            </Flex>

            <Box>
              <Text fontSize='4xl' fontWeight='medium' lineHeight='1'>
                <Amount.Fiat value={availableBalanceFiat.toFixed()} />
              </Text>
              <Text fontSize='sm' color='text.subtle' mt={1}>
                <Amount.Crypto
                  value={availableBalance.toFixed()}
                  symbol={yieldItem.token.symbol}
                  abbreviated
                />
              </Text>
            </Box>

            {potentialYearlyEarningsFiat.gt(0) && (
              <Alert status='success' borderRadius='lg' variant='subtle'>
                <Flex width='full' justify='space-between' align='center'>
                  <Text fontSize='sm' color='text.subtle'>
                    {translate('yieldXYZ.potentialEarnings')}
                  </Text>
                  <Amount.Fiat
                    fontSize='lg'
                    color='text.success'
                    fontWeight='semibold'
                    value={potentialYearlyEarningsFiat.toFixed()}
                    suffix='/yr'
                  />
                </Flex>
              </Alert>
            )}
            <Button colorScheme='green' size='lg' onClick={handleEnter}>
              {translate('yieldXYZ.startEarning')}
            </Button>
          </VStack>
        </CardBody>
      </Card>
    )
  },
)
