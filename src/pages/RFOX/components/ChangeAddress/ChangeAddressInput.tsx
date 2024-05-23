import { Box, Button, CardFooter, Collapse, Flex, Input, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { type FC, useCallback, useEffect, useMemo } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import type { Address } from 'viem'
import { encodeFunctionData, getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { middleEllipsis } from 'lib/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressSelection } from '../AddressSelection'
import type { ChangeAddressInputValues, RfoxChangeAddressQuote } from './types'
import { ChangeAddressRoutePaths, type ChangeAddressRouteProps } from './types'

type ChangeAddressInputProps = {
  stakingAssetId?: AssetId
  setConfirmedQuote: (quote: RfoxChangeAddressQuote | undefined) => void
}

export const ChangeAddressInput: FC<ChangeAddressRouteProps & ChangeAddressInputProps> = ({
  headerComponent,
  stakingAssetId = foxOnArbitrumOneAssetId,
  setConfirmedQuote,
}) => {
  const wallet = useWallet().state.wallet
  const translate = useTranslate()
  const history = useHistory()
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  // TODO(gomes): make this programmatic when we implement multi-account
  const stakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )
  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: stakingAssetId,
      accountId: stakingAssetAccountId,
    }
  }, [stakingAssetAccountId, stakingAssetId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const defaultFormValues = {
    manualRuneAddress: '',
    newRuneAddress: '',
  }

  const methods = useForm<ChangeAddressInputValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: true,
  })

  const {
    setValue,
    trigger,
    formState: { errors },
    control,
    register,
  } = methods

  const newRuneAddress = useWatch<ChangeAddressInputValues, 'newRuneAddress'>({
    control,
    name: 'newRuneAddress',
  })

  const {
    data: currentRuneAddress,
    isLoading: isCurrentRuneAddressLoading,
    isSuccess: isCurrentRuneAddressSuccess,
  } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'stakingInfo',
    args: [stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address)], // actually defined, see enabled below
    chainId: arbitrum.id,
    query: {
      enabled: Boolean(stakingAssetAccountAddress),
      // TODO(gomes): unused destructurreg values isn't an omission, it's to ensure
      // we change it to stakingInfo[3] vs. stakingInfo[2] currently after we deploy and consume the latest version of the contract
      select: ([_stakingBalance, _unstakingBalance, runeAddress]) => runeAddress || undefined,
    },
  })

  const callData = useMemo(() => {
    if (!newRuneAddress) return

    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'setRuneAddress',
      args: [newRuneAddress],
    })
  }, [newRuneAddress])

  const isGetChangeAddressFeesEnabled = useMemo(
    () =>
      Boolean(
        currentRuneAddress &&
          stakingAssetAccountId &&
          stakingAssetAccountAddress &&
          wallet &&
          newRuneAddress &&
          callData &&
          feeAsset &&
          feeAssetMarketData &&
          !Boolean(errors.manualRuneAddress || errors.newRuneAddress),
      ),
    [
      currentRuneAddress,
      stakingAssetAccountId,
      stakingAssetAccountAddress,
      wallet,
      newRuneAddress,
      callData,
      feeAsset,
      feeAssetMarketData,
      errors.manualRuneAddress,
      errors.newRuneAddress,
    ],
  )

  const {
    data: changeAddressFees,
    isLoading: isChangeAddressFeesLoading,
    isSuccess: isChangeAddressFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountAddress!, // see isGetChangeAddressFeesEnabled
      accountNumber: stakingAssetAccountNumber!, // see isGetChangeAddressFeesEnabled
      data: callData!, // see isGetChangeAddressFeesEnabled
      value: '0', // contract call
      wallet: wallet!, // see isGetChangeAddressFeesEnabled
      feeAsset: feeAsset!, // see isGetChangeAddressFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetChangeAddressFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetChangeAddressFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const handleSubmit = useCallback(() => {
    if (!newRuneAddress || !stakingAssetAccountId || !currentRuneAddress) return

    setConfirmedQuote({
      stakingAssetAccountId,
      stakingAssetId,
      currentRuneAddress,
      newRuneAddress,
    })

    history.push(ChangeAddressRoutePaths.Confirm)
  }, [
    newRuneAddress,
    stakingAssetAccountId,
    setConfirmedQuote,
    stakingAssetId,
    currentRuneAddress,
    history,
  ])

  const handleRuneAddressChange = useCallback(
    (address: string | undefined) => {
      setValue('newRuneAddress', address, { shouldValidate: true })
    },
    [setValue],
  )

  const validateIsNewAddress = useCallback(
    (address: string) => {
      // This should never happen but it may
      if (!currentRuneAddress) return true

      return address !== currentRuneAddress
    },
    [currentRuneAddress],
  )

  // Trigger re-validation since react-hook-form validation methods are fired onChange and not in a component-reactive manner
  useEffect(() => {
    trigger('manualRuneAddress')
    trigger('newRuneAddress')
  }, [trigger, currentRuneAddress])

  if (!stakingAsset) return null

  return (
    <SlideTransition>
      <FormProvider {...methods}>
        <Stack>
          {headerComponent}
          <Stack px={6} py={4}>
            <Flex justifyContent='space-between' mb={2} flexDir={'column'}>
              <Text translation={'RFOX.currentRewardAddress'} fontWeight={'bold'} mb={2} />
              <Skeleton isLoaded={isCurrentRuneAddressSuccess}>
                <RawText fontSize='xl' color={currentRuneAddress ? 'text.base' : 'text.warning'}>
                  {currentRuneAddress
                    ? middleEllipsis(currentRuneAddress)
                    : translate('RFOX.noAddressFound')}
                </RawText>
              </Skeleton>
            </Flex>
          </Stack>
          <Box display={!!currentRuneAddress && isCurrentRuneAddressSuccess ? 'block' : 'none'}>
            <Skeleton isLoaded={isCurrentRuneAddressSuccess}>
              <Input
                type='hidden'
                {...register('newRuneAddress', {
                  minLength: 1,
                  validate: {
                    validateIsNewAddress: address => {
                      // User inputed something and then deleted it - don't trigger an invalid error, we're simply not ready, again.
                      if (!address) return true

                      const isNewAddress = validateIsNewAddress(address)

                      // Not a new address - we should obviously trigger an error
                      if (!isNewAddress) {
                        return translate('RFOX.sameAddressNotAllowed')
                      }

                      return true
                    },
                  },
                })}
              />
              <AddressSelection
                isNewAddress
                onRuneAddressChange={handleRuneAddressChange}
                validateIsNewAddress={validateIsNewAddress}
              />
            </Skeleton>
          </Box>
        </Stack>
        <Collapse in={isGetChangeAddressFeesEnabled}>
          <CardFooter
            borderTopWidth={1}
            borderColor='border.subtle'
            flexDir='column'
            gap={4}
            px={6}
            py={4}
            bg='background.surface.raised.accent'
          >
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Skeleton
                  isLoaded={Boolean(!isChangeAddressFeesLoading && changeAddressFees)}
                  height='30px'
                  width='full'
                >
                  <Amount.Fiat value={changeAddressFees?.txFeeFiat ?? 0} />
                </Skeleton>
              </Row.Value>
            </Row>
          </CardFooter>
        </Collapse>

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
            size='lg'
            mx={-2}
            onClick={handleSubmit}
            colorScheme={
              Boolean(errors.manualRuneAddress || errors.newRuneAddress) ? 'red' : 'blue'
            }
            isDisabled={
              !currentRuneAddress ||
              Boolean(errors.manualRuneAddress || errors.newRuneAddress) ||
              !newRuneAddress ||
              !isChangeAddressFeesSuccess
            }
            isLoading={isCurrentRuneAddressLoading || isChangeAddressFeesLoading}
          >
            {errors.newRuneAddress?.message ||
              errors.manualRuneAddress?.message ||
              translate('RFOX.changeAddress')}
          </Button>
        </CardFooter>
      </FormProvider>
    </SlideTransition>
  )
}
