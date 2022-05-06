import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import { Button, Link, ModalFooter, Stack, Text as CText, Tooltip } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectMarketDataById,
  selectValidatorByAddress,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingAction, StakingValues } from '../StakingCommon'

type StakeProps = {
  assetId: AssetId
  validatorAddress: string
  onClose: () => void
  onCancel: () => void
}

// TODO: Make this a derived selector after this is wired up
function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).toString()
}

export const StakeBroadcast = ({ assetId, validatorAddress, onClose, onCancel }: StakeProps) => {
  const validatorInfo = useAppSelector(state => selectValidatorByAddress(state, validatorAddress))
  const [loading, setLoading] = useState(false)
  const [broadcasted, setBroadcasted] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const { handleStakingAction } = useStakingAction()
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const translate = useTranslate()
  const methods = useFormContext<StakingValues>()
  const { handleSubmit, control } = methods
  const { txFee, fiatFee, cryptoAmount, gasLimit } = useWatch({ control })

  if (!validatorInfo || !txFee || !fiatFee || !cryptoAmount || !gasLimit) return null

  const onSubmit = async () => {
    if (broadcasted) {
      return onClose()
    }

    // TODO(gomes): We will need to listen to incoming Txs (which are currently not coming from the websocket) to determine broadcasted
    // state and react on broadcast errors instead of being optimistic
    setLoading(true)

    const broadcastTx = await handleStakingAction({
      asset,
      validator: validatorAddress,
      chainSpecific: {
        gas: gasLimit,
        fee: bnOrZero(txFee).times(`1e+${asset?.precision}`).toString(),
      },
      value: bnOrZero(cryptoAmount).times(`1e+${asset.precision}`).toString(),
      action: StakingAction.Stake,
    })
    setLoading(false)

    if (!broadcastTx) return

    setTxId(broadcastTx)
    setBroadcasted(true)
  }

  const cryptoYield = calculateYearlyYield(validatorInfo?.apr, bnOrZero(cryptoAmount).toPrecision())
  const fiatYield = bnOrZero(cryptoYield).times(bnOrZero(marketData.price)).toPrecision()

  return (
    <SlideTransition>
      <Flex
        as='form'
        pt='14px'
        pb='18px'
        px='30px'
        onSubmit={handleSubmit(onSubmit)}
        flexDirection='column'
        alignItems='center'
        justifyContent='space-between'
      >
        <Flex width='100%' mb='20px' justifyContent='space-between'>
          <Text color='gray.500' translation={'defi.stake'} />
          <Flex flexDirection='column' alignItems='flex-end'>
            <Amount.Fiat
              fontWeight='semibold'
              value={bnOrZero(cryptoAmount).times(marketData.price).toPrecision()}
            />
            <Amount.Crypto
              color='gray.500'
              value={bnOrZero(cryptoAmount).toPrecision()}
              symbol={asset.symbol}
            />
          </Flex>
        </Flex>
        <Flex width='100%' mb='30px' justifyContent='space-between'>
          <CText display='inline-flex' alignItems='center' color='gray.500'>
            {translate('defi.validator')}
            &nbsp;
            <Tooltip label={translate('defi.modals.staking.tooltip.validator')}>
              <InfoOutlineIcon />
            </Tooltip>
          </CText>
          <Link
            color={'blue.200'}
            target='_blank'
            href={`https://www.mintscan.io/cosmos/validators/${validatorAddress}`}
          >
            {validatorInfo.moniker}
          </Link>
        </Flex>
        <Flex width='100%' mb='35px' justifyContent='space-between'>
          <Text translation={'transactionRow.txid'} color='gray.500' />
          {txId && asset && (
            <Link
              isExternal
              color='blue.200'
              href={`${asset.explorerTxLink}${txId}`}
              target='_blank'
            >
              <MiddleEllipsis address={txId} />
            </Link>
          )}
        </Flex>
        <Flex width='100%' mb='35px' justifyContent='space-between'>
          <Text translation={'defi.averageApr'} color='gray.500' />
          <AprTag percentage={validatorInfo?.apr} />
        </Flex>
        <Flex width='100%' mb='13px' justifyContent='space-between'>
          <Text translation={'defi.estimatedYearlyRewards'} color='gray.500' />
          <Flex flexDirection='column' alignItems='flex-end'>
            <Amount.Crypto value={cryptoYield} symbol={asset.symbol} />
            <Amount.Fiat color='gray.500' value={fiatYield} />
          </Flex>
        </Flex>
        <Flex mb='6px' width='100%' justifyContent='space-between' mt='10px'>
          <CText display='inline-flex' alignItems='center' color='gray.500'>
            {translate('defi.gasFee')}
            &nbsp;
            <Tooltip
              label={translate('defi.modals.staking.tooltip.gasFees', {
                networkName: asset.name,
              })}
            >
              <InfoOutlineIcon />
            </Tooltip>
          </CText>
          <Flex flexDirection='column' alignItems='flex-end'>
            <Amount.Crypto value={bnOrZero(txFee).toString()} symbol={asset.symbol} />
            <Amount.Fiat color='gray.500' value={bnOrZero(fiatFee).toString()} />
          </Flex>
        </Flex>
        <ModalFooter width='100%' py='0' px='0' flexDir='column' textAlign='center' mt={1}>
          <Text
            textAlign='left'
            fontSize='sm'
            color='gray.500'
            translation={['defi.unbondInfoItWillTake', { unbondingDays: '21' }]}
            mb='18px'
          />
          <Stack direction='row' width='full' justifyContent='space-between'>
            <Button onClick={onCancel} size='lg' variant='ghost'>
              <Text translation='common.cancel' />
            </Button>
            <Button
              isLoading={loading}
              loadingText={translate('defi.modals.staking.stakingYourTokens')}
              colorScheme={'blue'}
              mb={2}
              size='lg'
              type='submit'
            >
              <Text
                translation={broadcasted ? 'modals.status.close' : 'defi.confirmAndBroadcast'}
              />
            </Button>
          </Stack>
        </ModalFooter>
      </Flex>
    </SlideTransition>
  )
}
