import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Flex,
  IconButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import React, { useMemo } from 'react'
import { FaPlus } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { assertUnreachable } from 'lib/utils'
import type { LpConfirmedWithdrawalQuote } from 'lib/utils/thorchain/lp/types'
import { AsymSide, type LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { usePools } from '../queries/hooks/usePools'
import { PoolIcon } from './PoolIcon'

type ReusableLpConfirmProps = {
  handleBack: () => void
  handleConfirm: () => void
  baseAssetId: AssetId
  confirmedQuote: LpConfirmedDepositQuote | LpConfirmedWithdrawalQuote
}

const dividerStyle = {
  marginLeft: '-1.2em',
  marginRight: '-1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0,
  opacity: 1,
  zIndex: 4,
}

export const ReusableLpConfirm: React.FC<ReusableLpConfirmProps> = ({
  handleBack,
  handleConfirm,
  baseAssetId,
  confirmedQuote,
}) => {
  const translate = useTranslate()
  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  const { data: parsedPools } = usePools()

  const pool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === confirmedQuote.opportunityId)
  }, [confirmedQuote.opportunityId, parsedPools])

  const asset = useAppSelector(state => selectAssetById(state, pool?.assetId ?? ''))

  const baseAsset = useAppSelector(state => selectAssetById(state, baseAssetId))

  const assetNetwork = useMemo(() => {
    if (!asset) return undefined
    return getChainAdapterManager().get(asset.chainId)?.getDisplayName()
  }, [asset])

  const baseAssetNetwork = useMemo(() => {
    if (!baseAsset) return undefined
    return getChainAdapterManager().get(baseAsset.chainId)?.getDisplayName()
  }, [baseAsset])

  const assetIds = useMemo(() => {
    if (!pool || !baseAsset) return []
    return [pool.assetId, baseAsset.assetId]
  }, [baseAsset, pool])

  const divider = useMemo(() => {
    if (pool?.asymSide) return <></>

    return (
      <Flex style={dividerStyle}>
        <Center borderRadius='full' bg='background.surface.base' boxSize='42px'>
          <Center boxSize='42px' borderRadius='full' bg='background.surface.raised.base'>
            <Card
              display='flex'
              boxSize='35px'
              alignItems='center'
              justifyContent='center'
              borderRadius='full'
              color='text.subtle'
              flexShrink={0}
              fontSize='xs'
            >
              <FaPlus />
            </Card>
          </Center>
        </Center>
      </Flex>
    )
  }, [pool?.asymSide])

  const depositCards = useMemo(() => {
    if (!pool || !asset || !baseAsset) return null

    const assets: Asset[] = (() => {
      if (!(pool && asset && baseAsset)) return []

      switch (pool.asymSide) {
        case null:
          return [baseAsset, asset]
        case AsymSide.Rune:
          return [baseAsset]
        case AsymSide.Asset:
          return [asset]
        default:
          assertUnreachable(pool.asymSide)
      }
    })()

    return (
      <Stack direction='row' divider={divider} position='relative'>
        {assets.map(_asset => {
          const [amountCryptoPrecision, amountFiatUserCurrency] = (() => {
            let cryptoAmount
            let amountFiatUserCurrency

            if ('runeCryptoDepositAmount' in confirmedQuote) {
              // confirmedQuote is LpConfirmedDepositQuote
              let depositQuote = confirmedQuote as LpConfirmedDepositQuote
              cryptoAmount =
                _asset.assetId === thorchainAssetId
                  ? depositQuote.runeCryptoDepositAmount
                  : depositQuote.assetCryptoDepositAmount
              amountFiatUserCurrency =
                _asset.assetId === thorchainAssetId
                  ? depositQuote.runeFiatDepositAmount
                  : depositQuote.assetFiatDepositAmount
            } else if ('runeCryptoWithdrawAmount' in confirmedQuote) {
              // confirmedQuote is LpConfirmedWithdrawalQuote
              let withdrawalQuote = confirmedQuote as LpConfirmedWithdrawalQuote
              cryptoAmount =
                _asset.assetId === thorchainAssetId
                  ? withdrawalQuote.runeCryptoWithdrawAmount
                  : withdrawalQuote.assetCryptoWithdrawAmount
              amountFiatUserCurrency =
                _asset.assetId === thorchainAssetId
                  ? withdrawalQuote.runeFiatWithdrawAmount
                  : withdrawalQuote.assetFiatWithdrawAmount
            }

            return [cryptoAmount, amountFiatUserCurrency]
          })()

          if (!amountCryptoPrecision || !amountFiatUserCurrency) return null

          return (
            <Card
              key={_asset.assetId}
              display='flex'
              alignItems='center'
              justifyContent='center'
              flexDir='column'
              gap={4}
              py={6}
              px={4}
              flex={1}
            >
              <AssetIcon size='sm' assetId={_asset.assetId} />
              <Stack textAlign='center' spacing={0}>
                <Amount.Crypto
                  fontWeight='bold'
                  value={amountCryptoPrecision}
                  maximumFractionDigits={4}
                  symbol={_asset.symbol}
                />
                <Amount.Fiat fontSize='sm' color='text.subtle' value={amountFiatUserCurrency} />
              </Stack>
            </Card>
          )
        })}
      </Stack>
    )
  }, [asset, baseAsset, confirmedQuote, divider, pool])

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: pool?.assetId,
    enabled: !!pool,
    swapperName: SwapperName.Thorchain,
  })

  const confirmCopy = useMemo(() => {
    if (isTradingActive === false) return translate('common.poolHalted')

    const message = (() => {
      if ('feeAmountFiat' in confirmedQuote) {
        // 'feeAmountFiat' exists, so confirmedQuote is an instance of LpConfirmedDepositQuote
        return translate('pools.confirmAndDeposit')
      } else {
        // 'feeAmountFiat' does not exist, so confirmedQuote is an instance of LpConfirmedWithdrawalQuote
        return translate('pools.confirmAndWithdraw')
      }
    })()
    return message
  }, [confirmedQuote, isTradingActive, translate])

  if (!(pool && asset && baseAsset)) return null

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1}></Flex>
      </CardHeader>
      <CardBody pt={0}>
        <Stack spacing={8}>
          {depositCards}
          <Timeline>
            <TimelineItem>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('pools.chainFee', { chain: 'ShapeShift' })}</Row.Label>
                <Row.Value>
                  {confirmedQuote &&
                  'feeAmountFiat' in confirmedQuote &&
                  !bn(confirmedQuote.feeAmountFiat).isZero() ? (
                    <Amount.Fiat value={confirmedQuote.feeAmountFiat} />
                  ) : (
                    <Amount.Fiat value={'0'} />
                  )}
                </Row.Value>
              </Row>
            </TimelineItem>
            {bnOrZero(confirmedQuote.runeGasFeeFiat).gt(0) && (
              <TimelineItem>
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('pools.chainFee', { chain: baseAssetNetwork })}</Row.Label>
                  <Row.Value>
                    <Amount.Fiat value={confirmedQuote.runeGasFeeFiat} />
                  </Row.Value>
                </Row>
              </TimelineItem>
            )}
            {bnOrZero(confirmedQuote.poolAssetGasFeeFiat).gt(0) && (
              <TimelineItem>
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('pools.chainFee', { chain: assetNetwork })}</Row.Label>
                  <Row.Value>
                    <Amount.Fiat value={confirmedQuote.poolAssetGasFeeFiat} />
                  </Row.Value>
                </Row>
              </TimelineItem>
            )}
            <TimelineItem>
              <Row fontSize='sm'>
                <Row.Label>{translate('pools.shareOfPool')}</Row.Label>
                <Row.Value>
                  <Amount.Percent value={confirmedQuote.shareOfPoolDecimalPercent} />
                </Row.Value>
              </Row>
            </TimelineItem>
          </Timeline>
        </Stack>
      </CardBody>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
        bg='background.surface.raised.accent'
      >
        <Row fontSize='sm'>
          <Row.Label>{translate('pools.pool')}</Row.Label>
          <Row.Value>
            <Flex gap={2} alignItems='center' justifyContent='center'>
              <PoolIcon size='xs' assetIds={assetIds} />
              <RawText fontWeight='medium'>
                {asset.symbol}/{baseAsset.symbol}
              </RawText>
            </Flex>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Crypto
                value={confirmedQuote.slippageRune ?? 'TODO - loading'}
                symbol={baseAsset.symbol}
              />
            </Skeleton>
          </Row.Value>
        </Row>
      </CardFooter>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Button
          mx={-2}
          size='lg'
          colorScheme={isTradingActive === false ? 'red' : 'blue'}
          onClick={handleConfirm}
          isDisabled={isTradingActive === false}
          isLoading={isTradingActiveLoading}
        >
          {confirmCopy}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
