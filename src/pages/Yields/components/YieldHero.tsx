import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  HStack,
  Link,
  Tag,
  TagLeftIcon,
  Text,
  VStack,
} from '@chakra-ui/react'
import qs from 'qs'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { getYieldActionLabelKeys, resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const enterIcon = <ArrowUpIcon />
const exitIcon = <ArrowDownIcon />

type ValidatorOrProviderInfo = {
  name: string
  logoURI?: string
  description?: string
  documentation?: string
} | null

type YieldHeroProps = {
  yieldItem: AugmentedYieldDto
  userBalanceUsd: string
  userBalanceCrypto: string
  validatorOrProvider: ValidatorOrProviderInfo
  titleOverride?: string
  inputTokenMarketData: { price?: string } | undefined
}

export const YieldHero = memo(
  ({
    yieldItem,
    userBalanceUsd,
    userBalanceCrypto,
    validatorOrProvider,
    titleOverride,
    inputTokenMarketData,
  }: YieldHeroProps) => {
    const navigate = useNavigate()
    const translate = useTranslate()
    const { location } = useBrowserRouter()

    const iconSource = resolveYieldInputAssetIcon(yieldItem)
    const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toFixed(2)
    const hasPosition = bnOrZero(userBalanceCrypto).gt(0)

    // Available to deposit logic
    const inputToken = yieldItem.inputTokens[0]
    const inputTokenAssetId = inputToken?.assetId ?? ''
    const inputTokenPrecision = inputToken?.decimals

    const assetIcon = useMemo(() => {
      if (iconSource.assetId) {
        return <AssetIcon assetId={iconSource.assetId} size='2xl' />
      }
      return <AssetIcon src={iconSource.src} size='2xl' />
    }, [iconSource])

    const availableBalanceBaseUnit = useAppSelector(state =>
      selectPortfolioCryptoBalanceBaseUnitByFilter(state, { assetId: inputTokenAssetId }),
    )

    const availableBalance = useMemo(
      () =>
        inputTokenPrecision != null
          ? bnOrZero(availableBalanceBaseUnit).shiftedBy(-inputTokenPrecision)
          : bnOrZero(0),
      [availableBalanceBaseUnit, inputTokenPrecision],
    )

    const availableBalanceFiat = useMemo(
      () => availableBalance.times(bnOrZero(inputTokenMarketData?.price)),
      [availableBalance, inputTokenMarketData?.price],
    )

    const potentialYearlyEarningsFiat = useMemo(
      () => availableBalanceFiat.times(bnOrZero(yieldItem?.rewardRate?.total)),
      [availableBalanceFiat, yieldItem?.rewardRate?.total],
    )

    const hasAvailableBalance = availableBalance.gt(0)
    const showAvailableToDeposit = !hasPosition && hasAvailableBalance

    const [searchParams] = useSearchParams()
    const validator = searchParams.get('validator')

    const handleAction = useCallback(
      (action: 'enter' | 'exit') => {
        navigate({
          pathname: location.pathname,
          search: qs.stringify({
            action,
            modal: 'yield',
            ...(validator ? { validator } : {}),
          }),
        })
      },
      [navigate, location.pathname, validator],
    )

    const handleEnter = useCallback(() => handleAction('enter'), [handleAction])
    const handleExit = useCallback(() => handleAction('exit'), [handleAction])

    const actionLabelKeys = getYieldActionLabelKeys(yieldItem.mechanics.type)
    const enterLabel = translate(actionLabelKeys.enter)
    const exitLabel = translate(actionLabelKeys.exit)

    const yieldTitle = titleOverride ?? yieldItem.metadata.name ?? yieldItem.token.symbol

    const descriptionSection = useMemo(() => {
      const docUrl = validatorOrProvider?.documentation ?? yieldItem.metadata.documentation
      const description = validatorOrProvider?.description ?? yieldItem.metadata.description
      if (!description && !docUrl) return null
      return (
        <HStack spacing={2} maxW='400px' justify='center'>
          {description && (
            <Text color='text.subtle' fontSize='sm' textAlign='center' lineHeight='short'>
              {description}
            </Text>
          )}
          {docUrl && (
            <Link
              href={docUrl}
              isExternal
              color='text.subtle'
              _hover={{ color: 'text.base' }}
              flexShrink={0}
            >
              <ExternalLinkIcon boxSize={4} />
            </Link>
          )}
        </HStack>
      )
    }, [
      validatorOrProvider?.description,
      validatorOrProvider?.documentation,
      yieldItem.metadata.documentation,
      yieldItem.metadata.description,
    ])

    return (
      <Card position='relative' overflow='hidden'>
        <Box
          position='absolute'
          top='-15%'
          left={0}
          right={0}
          bottom={0}
          zIndex={0}
          filter='blur(50px)'
        >
          {assetIcon}
        </Box>
        <VStack
          spacing={{ base: 3, md: 4 }}
          align='center'
          py={{ base: 4, md: 6 }}
          px={{ base: 3, md: 6 }}
          zIndex={1}
        >
          {assetIcon}
          <Text fontWeight='semibold' fontSize='md'>
            {yieldTitle}
          </Text>

          {yieldItem.metadata.deprecated && (
            <Alert status='error' borderRadius='lg' variant='subtle'>
              <AlertIcon />
              <AlertDescription fontSize='sm'>
                {translate('yieldXYZ.deprecatedDescription')}
              </AlertDescription>
            </Alert>
          )}

          {yieldItem.metadata.underMaintenance && !yieldItem.metadata.deprecated && (
            <Alert status='warning' borderRadius='lg' variant='subtle'>
              <AlertIcon />
              <AlertDescription fontSize='sm'>
                {translate('yieldXYZ.underMaintenanceDescription')}
              </AlertDescription>
            </Alert>
          )}

          <HStack spacing={2} justify='center' flexWrap='wrap'>
            {yieldItem.chainId && (
              <Tag borderRadius='full' pr={3} py={2} bg='background.button.secondary.base'>
                <TagLeftIcon as={ChainIcon} chainId={yieldItem.chainId} boxSize='20px' />
                <Text fontSize='sm' fontWeight='semibold' textTransform='capitalize'>
                  {yieldItem.network}
                </Text>
              </Tag>
            )}
            {validatorOrProvider?.name && (
              <Tag borderRadius='full' pr={3} py={2} bg='background.button.secondary.base'>
                {validatorOrProvider.logoURI && (
                  <TagLeftIcon
                    as={Avatar}
                    size='xs'
                    src={validatorOrProvider.logoURI}
                    name={validatorOrProvider.name}
                  />
                )}
                <Text fontSize='sm' fontWeight='semibold'>
                  {validatorOrProvider.name}
                </Text>
              </Tag>
            )}
          </HStack>

          {hasPosition ? (
            <>
              <VStack spacing={1} textAlign='center' py={8}>
                <Text color='text.subtle' fontSize='xs' lineHeight={1}>
                  {translate('yieldXYZ.myPosition')}
                </Text>
                <HStack spacing={2} align='center'>
                  <Text fontSize='4xl' fontWeight='bold' lineHeight='1'>
                    <Amount.Fiat value={userBalanceUsd} />
                  </Text>
                  <Badge
                    colorScheme='green'
                    fontSize='sm'
                    px={2}
                    py={1}
                    borderRadius='full'
                    fontWeight='semibold'
                  >
                    {apy}% {translate('common.apy')}
                  </Badge>
                </HStack>
                <Text color='text.subtle' fontSize='sm'>
                  <Amount.Crypto value={userBalanceCrypto} symbol={yieldItem.token.symbol} />
                </Text>
              </VStack>

              <HStack spacing={3} width='full'>
                <Button
                  leftIcon={enterIcon}
                  colorScheme='blue'
                  size='lg'
                  borderRadius='xl'
                  onClick={handleEnter}
                  flex={1}
                  fontWeight='bold'
                >
                  {enterLabel}
                </Button>
                <Button
                  leftIcon={exitIcon}
                  variant='outline'
                  size='lg'
                  borderRadius='xl'
                  onClick={handleExit}
                  flex={1}
                  fontWeight='bold'
                >
                  {exitLabel}
                </Button>
              </HStack>
            </>
          ) : (
            <>
              <GradientApy fontSize='4xl'>
                {apy}% {translate('common.apy')}
              </GradientApy>

              {!hasPosition && descriptionSection}

              {showAvailableToDeposit && (
                <Box
                  bg='transparent'
                  borderRadius='xl'
                  p={4}
                  width='full'
                  position='relative'
                  boxShadow='0 1px 0 var(--chakra-colors-border-base) inset, 0 0 0 1px var(--chakra-colors-border-base) inset'
                >
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
                  <VStack spacing={3} align='stretch'>
                    <Flex justify='space-between' align='center'>
                      <Text fontSize='sm' color='text.subtle'>
                        {translate('yieldXYZ.availableToDeposit')}
                      </Text>
                      <Text fontSize='md' fontWeight='semibold'>
                        <Amount.Fiat value={availableBalanceFiat.toFixed()} />
                      </Text>
                    </Flex>
                    {potentialYearlyEarningsFiat.gt(0) && (
                      <Flex justify='space-between' align='center'>
                        <Text fontSize='sm' color='text.subtle'>
                          {translate('yieldXYZ.potentialEarnings')}
                        </Text>
                        <Amount.Fiat
                          fontSize='md'
                          color='text.success'
                          fontWeight='semibold'
                          value={potentialYearlyEarningsFiat.toFixed()}
                          suffix='/yr'
                        />
                      </Flex>
                    )}
                  </VStack>
                </Box>
              )}

              <Button
                colorScheme='green'
                size='lg'
                width='full'
                borderRadius='xl'
                onClick={handleEnter}
                fontWeight='bold'
              >
                {translate('yieldXYZ.startEarning')}
              </Button>
            </>
          )}
        </VStack>
      </Card>
    )
  },
)
