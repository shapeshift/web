import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Badge,
  Button,
  HStack,
  Link,
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
}

export const YieldHero = memo(
  ({
    yieldItem,
    userBalanceUsd,
    userBalanceCrypto,
    validatorOrProvider,
    titleOverride,
  }: YieldHeroProps) => {
    const navigate = useNavigate()
    const translate = useTranslate()
    const { location } = useBrowserRouter()

    const iconSource = resolveYieldInputAssetIcon(yieldItem)
    const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toFixed(2)
    const hasExitBalance = bnOrZero(userBalanceCrypto).gt(0)

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
      <VStack
        spacing={{ base: 3, md: 4 }}
        align='center'
        py={{ base: 4, md: 6 }}
        px={{ base: 3, md: 6 }}
      >
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

        {!yieldItem.status.enter &&
          !yieldItem.metadata.deprecated &&
          !yieldItem.metadata.underMaintenance && (
            <Alert status='warning' borderRadius='lg' variant='subtle'>
              <AlertIcon />
              <AlertDescription fontSize='sm'>
                {translate('yieldXYZ.depositsDisabledDescription')}
              </AlertDescription>
            </Alert>
          )}

        <HStack spacing={4} justify='center' flexWrap='wrap'>
          <HStack spacing={2}>
            {iconSource.assetId ? (
              <AssetIcon assetId={iconSource.assetId} size='xs' />
            ) : (
              <AssetIcon src={iconSource.src} size='xs' />
            )}
            <Text fontSize='md' fontWeight='semibold'>
              {yieldItem.token.symbol}
            </Text>
          </HStack>
          {yieldItem.chainId && (
            <HStack spacing={2}>
              <ChainIcon chainId={yieldItem.chainId} boxSize='20px' />
              <Text fontSize='md' fontWeight='semibold' textTransform='capitalize'>
                {yieldItem.network}
              </Text>
            </HStack>
          )}
          {validatorOrProvider?.name && (
            <HStack spacing={2}>
              {validatorOrProvider.logoURI && (
                <Avatar
                  size='xs'
                  src={validatorOrProvider.logoURI}
                  name={validatorOrProvider.name}
                />
              )}
              <Text fontSize='md' fontWeight='semibold'>
                {validatorOrProvider.name}
              </Text>
            </HStack>
          )}
        </HStack>

        <Badge
          colorScheme='green'
          variant='subtle'
          borderRadius='full'
          px={3}
          py={1.5}
          fontWeight='bold'
          fontSize='sm'
        >
          {apy}% {translate('common.apy')}
        </Badge>

        {descriptionSection}

        <VStack spacing={1} textAlign='center'>
          <Text fontSize={{ base: '3xl', md: '4xl' }} fontWeight='bold' lineHeight='1'>
            <Amount.Fiat value={userBalanceUsd} />
          </Text>
          <Text color='text.subtle' fontSize={{ base: 'sm', md: 'md' }}>
            <Amount.Crypto value={userBalanceCrypto} symbol={yieldItem.token.symbol} />
          </Text>
        </VStack>

        <HStack
          spacing={{ base: 3, md: 4 }}
          width={{ base: 'full', md: 'auto' }}
          minW={{ md: '500px', lg: '600px' }}
        >
          <Button
            leftIcon={enterIcon}
            colorScheme='blue'
            size='lg'
            height={14}
            borderRadius='xl'
            onClick={handleEnter}
            flex={1}
            fontWeight='bold'
          >
            {enterLabel}
          </Button>
          {hasExitBalance && (
            <Button
              leftIcon={exitIcon}
              variant='outline'
              size='lg'
              height={14}
              borderRadius='xl'
              onClick={handleExit}
              flex={1}
              fontWeight='bold'
            >
              {exitLabel}
            </Button>
          )}
        </HStack>
      </VStack>
    )
  },
)
