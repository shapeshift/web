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
import type {
  AsymSide,
  type LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/types'
import {
  isLpConfirmedDepositQuote,
  isLpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { fromQuote } from '../utils'
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

  const { assetId, actionSide } = fromQuote(confirmedQuote)

  const poolAsset = useAppSelector(state => selectAssetById(state, assetId))
  const baseAsset = useAppSelector(state => selectAssetById(state, baseAssetId))

  const assetNetwork = useMemo(() => {
    if (!poolAsset) return
    return getChainAdapterManager().get(poolAsset.chainId)?.getDisplayName()
  }, [poolAsset])

  const baseAssetNetwork = useMemo(() => {
    if (!baseAsset) return
    return getChainAdapterManager().get(baseAsset.chainId)?.getDisplayName()
  }, [baseAsset])

  const assetIds = useMemo(() => {
    if (!poolAsset || !baseAsset) return []
    return [poolAsset.assetId, baseAsset.assetId]
  }, [baseAsset, poolAsset])

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: poolAsset?.assetId,
    swapperName: SwapperName.Thorchain,
  })

  const divider = useMemo(() => {
    if (actionSide !== 'sym') return <></>

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
  }, [actionSide])

  const depositCards = useMemo(() => {
    if (!poolAsset || !baseAsset) return null

    const assets: Asset[] = (() => {
      if (!(poolAsset && baseAsset)) return []

      switch (actionSide) {
        case AsymSide.Rune:
          return [baseAsset]
        case AsymSide.Asset:
          return [poolAsset]
        case 'sym':
          return [baseAsset, poolAsset]
        default:
          assertUnreachable(actionSide)
      }
    })()

    return (
      <Stack direction='row' divider={divider} position='relative'>
        {assets.map(_asset => {
          const [amountCryptoPrecision, amountFiatUserCurrency] = (() => {
            let cryptoAmount
            let amountFiatUserCurrency

            if (isLpConfirmedDepositQuote(confirmedQuote)) {
              cryptoAmount =
                _asset.assetId === thorchainAssetId
                  ? confirmedQuote.runeDepositAmountCryptoPrecision
                  : confirmedQuote.assetDepositAmountCryptoPrecision
              amountFiatUserCurrency =
                _asset.assetId === thorchainAssetId
                  ? confirmedQuote.runeDepositAmountFiatUserCurrency
                  : confirmedQuote.assetDepositAmountFiatUserCurrency
            } else if (isLpConfirmedWithdrawalQuote(confirmedQuote)) {
              cryptoAmount =
                _asset.assetId === thorchainAssetId
                  ? confirmedQuote.runeWithdrawAmountCryptoPrecision
                  : confirmedQuote.assetWithdrawAmountCryptoPrecision
              amountFiatUserCurrency =
                _asset.assetId === thorchainAssetId
                  ? confirmedQuote.runeWithdrawAmountFiatUserCurrency
                  : confirmedQuote.assetWithdrawAmountFiatUserCurrency
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
  }, [poolAsset, baseAsset, confirmedQuote, divider, actionSide])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  const confirmCopy = useMemo(() => {
    if (isTradingActive === false) return translate('common.poolHalted')

    const message = (() => {
      if (isLpConfirmedDepositQuote(confirmedQuote)) {
        return translate('pools.confirmAndDeposit')
      } else {
        return translate('pools.confirmAndWithdraw')
      }
    })()
    return message
  }, [confirmedQuote, isTradingActive, translate])

  if (!(poolAsset && baseAsset)) return null

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
                  isLpConfirmedDepositQuote(confirmedQuote) &&
                  !bn(confirmedQuote.feeAmountFiatUserCurrency).isZero() ? (
                    <Amount.Fiat value={confirmedQuote.feeAmountFiatUserCurrency} />
                  ) : (
                    <Amount.Fiat value={'0'} />
                  )}
                </Row.Value>
              </Row>
            </TimelineItem>
            {bnOrZero(confirmedQuote.runeGasFeeFiatUserCurrency).gt(0) && (
              <TimelineItem>
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('pools.chainFee', { chain: baseAssetNetwork })}</Row.Label>
                  <Row.Value>
                    <Amount.Fiat value={confirmedQuote.runeGasFeeFiatUserCurrency} />
                  </Row.Value>
                </Row>
              </TimelineItem>
            )}
            {bnOrZero(confirmedQuote.poolAssetGasFeeFiatUserCurrency).gt(0) && (
              <TimelineItem>
                <Row fontSize='sm' fontWeight='medium'>
                  <Row.Label>{translate('pools.chainFee', { chain: assetNetwork })}</Row.Label>
                  <Row.Value>
                    <Amount.Fiat value={confirmedQuote.poolAssetGasFeeFiatUserCurrency} />
                  </Row.Value>
                </Row>
              </TimelineItem>
            )}
            <TimelineItem>
              <Row fontSize='sm'>
                <Row.Label>{translate('pools.shareOfPool')}</Row.Label>
                <Row.Value>
                  <Amount.Percent
                    options={{ maximumFractionDigits: 8 }}
                    value={confirmedQuote.shareOfPoolDecimalPercent}
                  />
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
                {poolAsset.symbol}/{baseAsset.symbol}
              </RawText>
            </Flex>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={Boolean(confirmedQuote.slippageFiatUserCurrency)}>
              <Amount.Fiat value={confirmedQuote.slippageFiatUserCurrency} />
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
