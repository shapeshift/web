import { Button, CardBody, CardFooter, Flex, Skeleton, Stack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import type { NumberFormatValues } from 'react-number-format'
import { NumericFormat } from 'react-number-format'
import { useTranslate } from 'react-polyglot'

import { DepositMachineCtx } from './DepositMachineContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { CHAINFLIP_LENDING_ASSET_BY_ASSET_ID } from '@/lib/chainflip/constants'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { useChainflipMinimumDeposit } from '@/pages/ChainflipLending/hooks/useChainflipMinimumDeposit'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { allowedDecimalSeparators } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectPortfolioCryptoBalanceByFilter,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type DepositInputProps = {
  assetId: AssetId
}

export const DepositInput = ({ assetId }: DepositInputProps) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const walletSupportsEth = useWalletSupportsChain(ethChainId, wallet)
  const {
    number: { localeParts },
  } = useLocaleFormatter()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const { accountNumber } = useChainflipLendingAccount()
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const actorRef = DepositMachineCtx.useActorRef()
  const depositAmountCryptoPrecision = DepositMachineCtx.useSelector(
    s => s.context.depositAmountCryptoPrecision,
  )

  const chainId = useMemo(() => fromAssetId(assetId).chainId, [assetId])
  const walletSupportsAssetChain = useWalletSupportsChain(chainId, wallet)

  const poolChainAccountId = useMemo(() => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[chainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, chainId])

  const balanceFilter = useMemo(
    () => ({ assetId, accountId: poolChainAccountId ?? '' }),
    [assetId, poolChainAccountId],
  )
  const balanceCryptoBaseUnit = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
  ).toBaseUnit()

  const availableCryptoPrecision = useMemo(
    () =>
      BigAmount.fromBaseUnit({
        value: balanceCryptoBaseUnit,
        precision: asset?.precision ?? 0,
      }).toPrecision(),
    [balanceCryptoBaseUnit, asset?.precision],
  )

  const { freeBalances } = useChainflipAccount()

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const freeBalanceCryptoPrecision = useMemo(() => {
    if (!freeBalances || !cfAsset || !asset) return '0'
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    if (!matching?.balance) return '0'
    return BigAmount.fromBaseUnit({
      value: matching.balance,
      precision: asset.precision,
    }).toPrecision()
  }, [freeBalances, cfAsset, asset])

  const minDeposit = useChainflipMinimumDeposit(assetId)

  const isBelowMinimum = useMemo(() => {
    if (!minDeposit) return false
    const amount = bnOrZero(depositAmountCryptoPrecision)
    return amount.gt(0) && amount.lt(minDeposit)
  }, [depositAmountCryptoPrecision, minDeposit])

  const handleInputChange = useCallback(
    (values: NumberFormatValues) => {
      actorRef.send({ type: 'SET_AMOUNT', amount: values.value })
    },
    [actorRef],
  )

  const handleMaxClick = useCallback(() => {
    actorRef.send({ type: 'SET_AMOUNT', amount: availableCryptoPrecision })
  }, [availableCryptoPrecision, actorRef])

  const handleSubmit = useCallback(() => {
    actorRef.send({ type: 'SUBMIT_INPUT' })
  }, [actorRef])

  const isPortfolioLoaded = Boolean(poolChainAccountId) && portfolioLoadingStatus !== 'loading'

  const isValidWallet = useMemo(
    () => Boolean(walletSupportsEth && walletSupportsAssetChain),
    [walletSupportsEth, walletSupportsAssetChain],
  )

  const isSubmitDisabled = useMemo(() => {
    const isZero = bnOrZero(depositAmountCryptoPrecision).isZero()
    const exceedsBalance = bnOrZero(depositAmountCryptoPrecision).gt(availableCryptoPrecision)
    return isZero || exceedsBalance
  }, [depositAmountCryptoPrecision, availableCryptoPrecision])

  if (!asset) return null

  return (
    <SlideTransition>
      <CardBody px={6} py={4}>
        <VStack spacing={4} align='stretch'>
          <Flex alignItems='center' gap={2}>
            <AssetIcon assetId={assetId} size='sm' />
            <RawText fontWeight='bold' fontSize='lg'>
              {asset.symbol}
            </RawText>
          </Flex>

          <Stack spacing={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.deposit.amount')}
            </RawText>
            <NumericFormat
              inputMode='decimal'
              valueIsNumericString={true}
              decimalScale={asset.precision}
              thousandSeparator={localeParts.group}
              decimalSeparator={localeParts.decimal}
              allowedDecimalSeparators={allowedDecimalSeparators}
              allowNegative={false}
              allowLeadingZeros={false}
              value={depositAmountCryptoPrecision}
              placeholder='0.00'
              onValueChange={handleInputChange}
              style={{
                width: '100%',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '0.5rem 0',
              }}
            />
          </Stack>

          <Flex justifyContent='space-between' alignItems='center'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.deposit.available')}
            </RawText>
            <Flex alignItems='center' gap={2}>
              <Skeleton isLoaded={isPortfolioLoaded}>
                <Amount.Crypto
                  value={availableCryptoPrecision}
                  symbol={asset.symbol}
                  fontSize='sm'
                  fontWeight='medium'
                />
              </Skeleton>
              <Button
                size='xs'
                variant='ghost'
                colorScheme='blue'
                onClick={handleMaxClick}
                isDisabled={!isPortfolioLoaded}
              >
                {translate('modals.send.sendForm.max')}
              </Button>
            </Flex>
          </Flex>

          {minDeposit && bnOrZero(minDeposit).gt(0) && (
            <Flex justifyContent='space-between' alignItems='center'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.deposit.minimumDeposit')}
              </RawText>
              <RawText
                fontSize='sm'
                fontWeight='medium'
                color={isBelowMinimum ? 'red.500' : 'text.base'}
              >
                {minDeposit} {asset.symbol}
              </RawText>
            </Flex>
          )}

          <Flex justifyContent='space-between' alignItems='center'>
            <HelperTooltip
              label={translate('chainflipLending.deposit.freeBalanceTooltip', {
                asset: asset.symbol,
              })}
            >
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.deposit.freeBalance')}
              </RawText>
            </HelperTooltip>
            <Amount.Crypto
              value={freeBalanceCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              fontWeight='medium'
            />
          </Flex>

          <RawText fontSize='xs' color='text.subtle'>
            {translate('chainflipLending.deposit.explainer')}
          </RawText>
        </VStack>
      </CardBody>

      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
      >
        <ButtonWalletPredicate
          isValidWallet={isValidWallet}
          colorScheme='blue'
          size='lg'
          height={12}
          borderRadius='xl'
          width='full'
          fontWeight='bold'
          onClick={handleSubmit}
          isDisabled={isSubmitDisabled}
        >
          {translate('chainflipLending.deposit.openChannel')}
        </ButtonWalletPredicate>
      </CardFooter>
    </SlideTransition>
  )
}
