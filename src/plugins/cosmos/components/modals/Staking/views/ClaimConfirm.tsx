import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import {
  Button,
  FormControl,
  ModalFooter,
  ModalHeader,
  Stack,
  Text as CText,
  Tooltip
} from '@chakra-ui/react'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters } from '@shapeshiftoss/types'
import { TxFeeRadioGroup } from 'plugins/cosmos/components/TxFeeRadioGroup/TxFeeRadioGroup'
import { useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  ASSET_ID_TO_DENOM,
  selectAssetByCAIP19,
  selectMarketDataById,
  selectRewardsAmountByDenom
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimPath } from '../StakingCommon'

export enum Field {
  FeeType = 'feeType'
}

export type StakingValues = {
  [Field.FeeType]: chainAdapters.FeeDataKey
}

type ClaimConfirmProps = {
  assetId: CAIP19
  accountSpecifier: CAIP10
}

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'

export const ClaimConfirm = ({ assetId, accountSpecifier }: ClaimConfirmProps) => {
  const methods = useForm<StakingValues>({
    mode: 'onChange',
    defaultValues: {
      [Field.FeeType]: chainAdapters.FeeDataKey.Average
    }
  })

  const { handleSubmit } = methods

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const rewardsCryptoAmount = useAppSelector(state =>
    selectRewardsAmountByDenom(
      state,
      accountSpecifier,
      SHAPESHIFT_VALIDATOR_ADDRESS,
      ASSET_ID_TO_DENOM[assetId]
    )
  )

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const rewardsCryptoAmountPrecision = useMemo(
    () => bnOrZero(rewardsCryptoAmount).div(`1e+${asset.precision}`).toString(),
    [asset.precision, rewardsCryptoAmount]
  )
  const rewardsFiatAmountPrecision = useMemo(
    () => bnOrZero(rewardsCryptoAmountPrecision).times(marketData.price).toString(),
    [marketData, rewardsCryptoAmountPrecision]
  )

  const memoryHistory = useHistory()

  const onSubmit = (result: any) => {
    memoryHistory.push(ClaimPath.Broadcast, {
      cryptoAmount: rewardsCryptoAmount,
      fiatRate: marketData.price
    })
  }

  const translate = useTranslate()

  const { cosmosStaking } = useModal()

  const handleCancel = () => {
    memoryHistory.goBack()
    cosmosStaking.close()
  }

  return (
    <FormProvider {...methods}>
      <SlideTransition>
        <Flex
          as='form'
          pt='14px'
          pb='18px'
          px='30px'
          onSubmit={handleSubmit(onSubmit)}
          direction='column'
          alignItems='center'
          justifyContent='space-between'
        >
          <ModalHeader textAlign='center'>
            <Amount.Fiat
              fontWeight='bold'
              fontSize='4xl'
              mb={-4}
              value={rewardsFiatAmountPrecision}
            />
          </ModalHeader>
          <Amount.Crypto
            color='gray.500'
            fontWeight='normal'
            fontSize='xl'
            value={rewardsCryptoAmountPrecision}
            symbol={asset.symbol}
          />
          <Flex mb='6px' mt='15px' width='100%'>
            <CText display='inline-flex' alignItems='center' color='gray.500'>
              {translate('defi.gasFee')}
              &nbsp;
              <Tooltip
                label={translate('defi.modals.staking.tooltip.gasFees', {
                  networkName: asset.name
                })}
              >
                <InfoOutlineIcon />
              </Tooltip>
            </CText>
          </Flex>
          <FormControl>
            <TxFeeRadioGroup
              asset={asset}
              mb='10px'
              fees={{
                slow: {
                  txFee: '0',
                  fiatFee: '0'
                },
                average: {
                  txFee: '0.01',
                  fiatFee: '0.02'
                },
                fast: {
                  txFee: '0.03',
                  fiatFee: '0.04'
                }
              }}
            />
          </FormControl>
          <Text
            mt={1}
            width='100%'
            color='gray.500'
            fontSize={'sm'}
            translation='defi.modals.claim.rewardDepositInfo'
          />
          <ModalFooter width='100%' p='0' flexDir='column' textAlign='center' mt={10}>
            <Stack direction='row' width='full' justifyContent='space-between'>
              <Button
                onClick={handleCancel}
                size='lg'
                variant='ghost'
                backgroundColor='gray.700'
                fontWeight='normal'
              >
                <Text translation='common.cancel' mx={5} />
              </Button>
              <Button colorScheme={'blue'} mb={2} size='lg' type='submit' fontWeight='normal'>
                <Text translation={'defi.modals.claim.confirmAndClaim'} />
              </Button>
            </Stack>
          </ModalFooter>
        </Flex>
      </SlideTransition>
    </FormProvider>
  )
}
