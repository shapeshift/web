import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Flex,
  Link,
  Progress,
  Skeleton,
  useColorModeValue,
} from '@chakra-ui/react'
import { Tag, TagLeftIcon } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { BiErrorCircle } from 'react-icons/bi'
import { FaTwitter } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { DynamicComponent } from 'components/DynamicComponent'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { usePoolDataQuery } from 'pages/Lending/hooks/usePoolDataQuery'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

const labelProps = { fontSize: 'sm ' }
const responsiveFlex = { base: 'auto', lg: 1 }
const mobileDisplay = {
  base: 'none',
  lg: 'flex',
}
const faTwitterIcon = <FaTwitter />

type PoolInfoProps = {
  poolAssetId: AssetId
}

export const PoolInfo = ({ poolAssetId }: PoolInfoProps) => {
  const alertBg = useColorModeValue('gray.200', 'gray.900')
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, poolAssetId))

  const usePoolDataArgs = useMemo(() => ({ poolAssetId }), [poolAssetId])
  const { data: poolData, isLoading: isPoolDataLoading } = usePoolDataQuery(usePoolDataArgs)

  const totalCollateralComponent = useMemo(
    () => (
      <Amount.Crypto
        fontSize='2xl'
        value={poolData?.totalCollateralCryptoPrecision ?? '0'}
        symbol={asset?.symbol ?? ''}
        fontWeight='medium'
      />
    ),
    [asset?.symbol, poolData?.totalCollateralCryptoPrecision],
  )
  const totalDebtBalance = useMemo(
    () => (
      <Amount.Fiat
        fontSize='2xl'
        value={poolData?.totalDebtUserCurrency ?? 0}
        fontWeight='medium'
      />
    ),
    [poolData?.totalDebtUserCurrency],
  )
  const estCollateralizationRatioComponent = useMemo(
    () => (
      <Amount.Percent
        value={poolData?.collateralizationRatioPercentDecimal ?? '0'}
        color='text.success'
        fontSize='lg'
      />
    ),
    [poolData?.collateralizationRatioPercentDecimal],
  )
  const totalBorrowersComponent = useMemo(
    () => <RawText fontSize='lg'>{poolData?.totalBorrowers ?? '0'}</RawText>,
    [poolData?.totalBorrowers],
  )

  const StatusTag = useCallback(() => {
    if (poolData?.isHardCapReached || poolData?.currentCapFillPercentage === 100) {
      return (
        <Tag colorScheme='yellow'>
          <TagLeftIcon as={BiErrorCircle} />
          {translate('common.full')}
        </Tag>
      )
    }

    if (poolData?.isTradingActive) {
      return (
        <Tag colorScheme='green'>
          <TagLeftIcon as={CheckCircleIcon} />
          {translate('common.active')}
        </Tag>
      )
    }

    return (
      <Tag colorScheme='red'>
        <TagLeftIcon as={BiErrorCircle} />
        {translate('common.halted')}
      </Tag>
    )
  }, [poolData, translate])

  const renderVaultCap = useMemo(() => {
    if (!poolData || !asset) return null

    return (
      <Flex flexWrap='wrap' direction='column' gap={4}>
        <Flex justifyContent='space-between' alignItems='center'>
          <HelperTooltip label={translate('defi.modals.saversVaults.vaultCapTooltip')}>
            <Text fontWeight='medium' translation='defi.modals.saversVaults.vaultCap' />
          </HelperTooltip>
          <Flex gap={1}>
            <Amount.Fiat value={poolData?.tvl} />
            <Amount.Fiat value={poolData?.maxSupplyFiat} prefix='/' color='text.subtle' />
          </Flex>
        </Flex>
        {poolData.isHardCapReached || bnOrZero(poolData.currentCapFillPercentage).eq(100) ? (
          <Alert status='warning' flexDir='column' bg={alertBg} py={4}>
            <AlertIcon />
            <AlertTitle>{translate('defi.modals.saversVaults.haltedDepositTitle')}</AlertTitle>
            <>
              <AlertDescription>
                {translate('defi.modals.saversVaults.haltedDescription')}
              </AlertDescription>
              <Button
                as={Link}
                href={`https://twitter.com/intent/tweet?text=Hey%20%40THORChain%20%23raisethecaps%20already%20so%20I%20can%20lend%20%23${asset.symbol}%20on%20%40ShapeShift`}
                isExternal
                mt={4}
                colorScheme='twitter'
                rightIcon={faTwitterIcon}
              >
                @THORChain
              </Button>
            </>
          </Alert>
        ) : (
          <Progress
            value={poolData.currentCapFillPercentage}
            size='sm'
            borderRadius='md'
            colorScheme={bnOrZero(poolData.currentCapFillPercentage).lt(100) ? 'green' : 'red'}
          />
        )}
      </Flex>
    )
  }, [alertBg, asset, poolData, translate])

  if (!asset) return null

  return (
    <>
      <Flex gap={4} alignItems='center'>
        <Text translation='lending.poolInformation' fontWeight='medium' />

        <Skeleton isLoaded={!isPoolDataLoading} display={mobileDisplay}>
          <StatusTag />
        </Skeleton>
      </Flex>
      <Flex flexWrap='wrap' gap={4}>
        <DynamicComponent
          isLoading={isPoolDataLoading}
          label='lending.totalCollateral'
          component={totalCollateralComponent}
          flex={responsiveFlex}
          labelProps={labelProps}
        />
        <DynamicComponent
          isLoading={isPoolDataLoading}
          label='lending.totalDebtBalance'
          component={totalDebtBalance}
          flex={responsiveFlex}
          labelProps={labelProps}
        />
      </Flex>
      <Flex flexWrap='wrap' gap={4}>
        <DynamicComponent
          isLoading={isPoolDataLoading}
          label='lending.estCollateralizationRatio'
          component={estCollateralizationRatioComponent}
          flex={responsiveFlex}
          labelProps={labelProps}
        />
        <DynamicComponent
          isLoading={isPoolDataLoading}
          label='lending.totalBorrowers'
          component={totalBorrowersComponent}
          flex={responsiveFlex}
          labelProps={labelProps}
        />
      </Flex>
      {renderVaultCap}
    </>
  )
}
