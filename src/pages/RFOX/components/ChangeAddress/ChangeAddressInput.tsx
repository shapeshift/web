import {
  Box,
  Button,
  CardBody,
  CardFooter,
  Collapse,
  Flex,
  Input,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { fromAccountId, fromAssetId, uniV2EthFoxArbitrumAssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI, RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/AssetSelection/AssetSelection'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useEvmFees } from 'hooks/queries/useEvmFees'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { middleEllipsis } from 'lib/utils'
import type {
  GetFeesWithWalletEip1559SupportArgs,
  MaybeGetFeesWithWalletEip1559Args,
} from 'lib/utils/evm'
import { assertGetEvmChainAdapter, isGetFeesWithWalletEIP1559SupportArgs } from 'lib/utils/evm'
import { selectRuneAddress } from 'pages/RFOX/helpers'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressSelection } from '../AddressSelection'
import { ChainNotSupported } from '../Shared/ChainNotSupported'
import { ConnectWallet } from '../Shared/ConnectWallet'
import type {
  ChangeAddressInputValues,
  ChangeAddressRouteProps,
  RfoxChangeAddressQuote,
} from './types'
import { ChangeAddressRoutePaths } from './types'

type ChangeAddressInputProps = {
  setConfirmedQuote: (quote: RfoxChangeAddressQuote | undefined) => void
}

export const ChangeAddressInput: FC<ChangeAddressRouteProps & ChangeAddressInputProps> = ({
  headerComponent,
  setConfirmedQuote,
}) => {
  const { stakingAssetId, stakingAssetAccountId, setSelectedAssetId, selectedAssetId } =
    useRFOXContext()
  const { wallet, isConnected } = useWallet().state
  const translate = useTranslate()
  const history = useHistory()
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const foxEthLpArbitrumAsset = useAppSelector(state =>
    selectAssetById(state, uniV2EthFoxArbitrumAssetId),
  )

  const buyAssetSearch = useModal('buyAssetSearch')

  const assetIds = useMemo(() => [stakingAssetId, uniV2EthFoxArbitrumAssetId], [stakingAssetId])

  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  const adapter = useMemo(
    () => (feeAsset ? assertGetEvmChainAdapter(fromAssetId(feeAsset.assetId).chainId) : undefined),
    [feeAsset],
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
  } = useStakingInfoQuery({
    stakingAssetAccountAddress,
    stakingAssetId: selectedAssetId,
    select: selectRuneAddress,
  })

  const callData = useMemo(() => {
    if (!newRuneAddress) return

    return encodeFunctionData({
      abi: RFOX_ABI,
      functionName: 'setRuneAddress',
      args: [newRuneAddress],
    })
  }, [newRuneAddress])

  const isGetChangeAddressFeesEnabled = useCallback(
    (input: MaybeGetFeesWithWalletEip1559Args): input is GetFeesWithWalletEip1559SupportArgs =>
      Boolean(
        isGetFeesWithWalletEIP1559SupportArgs(input) &&
          currentRuneAddress &&
          newRuneAddress &&
          !Boolean(errors.manualRuneAddress || errors.newRuneAddress),
      ),
    [currentRuneAddress, errors.manualRuneAddress, errors.newRuneAddress, newRuneAddress],
  )

  const changeAddressFeesQueryInput = useMemo(
    () => ({
      to: RFOX_PROXY_CONTRACT,
      from: stakingAssetAccountAddress,
      chainId: fromAssetId(stakingAssetId).chainId,
      accountNumber: stakingAssetAccountNumber,
      data: callData,
      value: '0',
    }),
    [callData, stakingAssetAccountAddress, stakingAssetAccountNumber, stakingAssetId],
  )

  const getFeesWithWalletInput = useMemo(
    () => ({ ...changeAddressFeesQueryInput, adapter, wallet }),
    [adapter, changeAddressFeesQueryInput, wallet],
  )

  const {
    data: changeAddressFees,
    isLoading: isChangeAddressFeesLoading,
    isSuccess: isChangeAddressFeesSuccess,
  } = useEvmFees({
    ...changeAddressFeesQueryInput,
    enabled: Boolean(
      currentRuneAddress &&
        newRuneAddress &&
        !Boolean(errors.manualRuneAddress || errors.newRuneAddress),
    ),
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const handleSubmit = useCallback(() => {
    if (!newRuneAddress || !stakingAssetAccountId || !currentRuneAddress) return

    setConfirmedQuote({
      stakingAssetAccountId,
      stakingAssetId: selectedAssetId,
      currentRuneAddress,
      newRuneAddress,
    })

    history.push(ChangeAddressRoutePaths.Confirm)
  }, [
    newRuneAddress,
    stakingAssetAccountId,
    setConfirmedQuote,
    selectedAssetId,
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

  const handleAssetChange = useCallback(
    (asset: Asset) => {
      setSelectedAssetId(asset.assetId)
      // Reset address field when changing assets
      setValue('newRuneAddress', '', { shouldValidate: true })
    },
    [setValue, setSelectedAssetId],
  )

  const handleStakingAssetClick = useCallback(() => {
    if (!(stakingAsset && foxEthLpArbitrumAsset)) return

    buyAssetSearch.open({
      onAssetClick: asset => setSelectedAssetId(asset.assetId),
      title: 'common.selectAsset',
      assets: [stakingAsset, foxEthLpArbitrumAsset],
    })
  }, [stakingAsset, foxEthLpArbitrumAsset, buyAssetSearch, setSelectedAssetId])

  if (!isConnected)
    return (
      <SlideTransition>
        <Stack>{headerComponent}</Stack>
        <CardBody py={12}>
          <ConnectWallet />
        </CardBody>
      </SlideTransition>
    )

  if (!stakingAssetAccountAddress)
    return (
      <SlideTransition>
        <Stack>{headerComponent}</Stack>
        <CardBody py={12}>
          <ChainNotSupported chainId={stakingAsset?.chainId} />
        </CardBody>
      </SlideTransition>
    )
  if (!stakingAsset) return null

  return (
    <SlideTransition>
      <FormProvider {...methods}>
        <Stack>
          {headerComponent}
          <Stack spacing={4}>
            <Text translation='common.selectAsset' fontWeight='bold' px={6} />
            <TradeAssetSelect
              assetId={selectedAssetId}
              onAssetClick={handleStakingAssetClick}
              onAssetChange={handleAssetChange}
              assetIds={assetIds}
              onlyConnectedChains={true}
            />
          </Stack>
          <Stack px={6} py={4}>
            <Flex justifyContent='space-between' mb={2} flexDir={'column'}>
              <Text translation={'RFOX.currentRewardAddress'} fontWeight={'bold'} mb={2} />
              <Skeleton isLoaded={isCurrentRuneAddressSuccess}>
                <RawText fontSize='xl' color={currentRuneAddress ? 'text.base' : 'text.warning'}>
                  {currentRuneAddress ? (
                    <InlineCopyButton value={currentRuneAddress}>
                      {middleEllipsis(currentRuneAddress)}
                    </InlineCopyButton>
                  ) : (
                    translate('RFOX.noAddressFound')
                  )}
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
                selectedAddress={newRuneAddress}
                setStepIndex={undefined}
              />
            </Skeleton>
          </Box>
        </Stack>
        <Collapse in={isGetChangeAddressFeesEnabled(getFeesWithWalletInput)}>
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
