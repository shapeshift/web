import { Button, CardFooter, Flex, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { type FC, useCallback, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { AddressSelectionValues } from 'pages/RFOX/types'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectFirstAccountIdByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressSelection } from '../AddressSelection'
import { ChangeAddressRoutePaths, type ChangeAddressRouteProps } from './types'

type ChangeAddressInputProps = {
  onNewRuneAddressChange: (address: string | undefined) => void
  newRuneAddress: string | undefined
  stakingAssetId?: AssetId
}

export const ChangeAddressInput: FC<ChangeAddressRouteProps & ChangeAddressInputProps> = ({
  headerComponent,
  onNewRuneAddressChange,
  newRuneAddress,
  stakingAssetId = foxOnArbitrumOneAssetId,
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

  const hasValidNewRuneAddress = useMemo(() => !!newRuneAddress, [newRuneAddress])

  const defaultFormValues = {
    manualRuneAddress: '',
  }

  const methods = useForm<AddressSelectionValues>({
    defaultValues: defaultFormValues,
    mode: 'onChange',
    shouldUnregister: true,
  })

  const {
    formState: { errors },
  } = methods

  const handleSubmit = useCallback(() => {
    if (!hasValidNewRuneAddress) return

    history.push(ChangeAddressRoutePaths.Confirm)
  }, [hasValidNewRuneAddress, history])

  const handleRuneAddressChange = useCallback(
    (address: string | undefined) => {
      onNewRuneAddressChange(address)
    },
    [onNewRuneAddressChange],
  )

  const callData = useMemo(() => {
    if (!hasValidNewRuneAddress) return

    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'setRuneAddress',
      args: [newRuneAddress!], // actually defined, see isGetUnstakeFeesEnabled below
    })
  }, [hasValidNewRuneAddress, newRuneAddress])

  const isGetChangeAddressFeesEnabled = useMemo(
    () =>
      Boolean(
        stakingAssetAccountId &&
          stakingAssetAccountNumber !== undefined &&
          wallet &&
          newRuneAddress &&
          callData &&
          feeAsset &&
          feeAssetMarketData &&
          !Boolean(errors.manualRuneAddress),
      ),
    [
      stakingAssetAccountId,
      stakingAssetAccountNumber,
      wallet,
      newRuneAddress,
      callData,
      feeAsset,
      feeAssetMarketData,
      errors.manualRuneAddress,
    ],
  )

  const {
    data: changeAddressFees,
    isLoading: isChangeAddressFeesLoading,
    isSuccess: isChangeAddressFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : '', // see isGetStakeFeesEnabled
      accountNumber: stakingAssetAccountNumber!, // see isGetStakeFeesEnabled
      data: callData!, // see isGetStakeFeesEnabled
      value: '0', // contract call
      wallet: wallet!, // see isGetStakeFeesEnabled
      feeAsset: feeAsset!, // see isGetStakeFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetStakeFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetChangeAddressFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  if (!stakingAsset) return null

  return (
    <SlideTransition>
      <FormProvider {...methods}>
        <Stack>
          {headerComponent}
          <Stack px={6} py={4}>
            <Flex justifyContent='space-between' mb={2} flexDir={'column'}>
              <Text translation={'RFOX.currentRewardAddress'} fontWeight={'bold'} mb={2} />
              <RawText as={'h4'}>1234</RawText>
            </Flex>
          </Stack>
          <AddressSelection isNewAddress onRuneAddressChange={handleRuneAddressChange} />
        </Stack>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          py={4}
          bg='background.surface.raised.accent'
        >
          {isGetChangeAddressFeesEnabled && (
            <Row fontSize='sm' fontWeight='medium'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Skeleton
                  isLoaded={Boolean(!isChangeAddressFeesLoading && changeAddressFees)}
                  height='14px'
                  width='50px'
                >
                  <Amount.Fiat value={changeAddressFees?.txFeeFiat ?? 0} />
                </Skeleton>
              </Row.Value>
            </Row>
          )}
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
            size='lg'
            mx={-2}
            onClick={handleSubmit}
            colorScheme={Boolean(errors.manualRuneAddress) ? 'red' : 'blue'}
            isDisabled={
              Boolean(errors.manualRuneAddress) || !newRuneAddress || !isChangeAddressFeesSuccess
            }
            isLoading={isChangeAddressFeesLoading}
          >
            {errors.manualRuneAddress?.message || translate('RFOX.changeAddress')}
          </Button>
        </CardFooter>
      </FormProvider>
    </SlideTransition>
  )
}
