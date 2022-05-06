import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import { Button, Link, ModalCloseButton, Text as CText, Tooltip } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import {
  selectAssetById,
  selectMarketDataById,
  selectValidatorByAddress,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingAction, StakingValues } from '../StakingCommon'

type UnstakeBroadcastProps = {
  assetId: AssetId
  onClose: () => void
  validatorAddress: string
}

export const UnstakeBroadcast = ({ assetId, validatorAddress, onClose }: UnstakeBroadcastProps) => {
  const [loading, setLoading] = useState(false)
  const [broadcasted, setBroadcasted] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const validatorInfo = useAppSelector(state =>
    selectValidatorByAddress(state, { validatorAddress }),
  )

  const translate = useTranslate()

  const methods = useFormContext<StakingValues>()
  const { handleSubmit, control } = methods
  const { handleStakingAction } = useStakingAction()
  const { txFee, fiatFee, cryptoAmount, gasLimit } = useWatch({ control })

  if (!txFee || !fiatFee || !cryptoAmount || !gasLimit) return null

  // We will also need to listen to incoming Txs (which are currently not coming from the websocket) to determine broadcasted
  // state and react on broadcast errors instead of being optimistic
  const onSubmit = async () => {
    if (broadcasted) {
      return onClose()
    }

    setLoading(true)
    const broadcastTx = await handleStakingAction({
      asset,
      validator: validatorAddress,
      chainSpecific: {
        gas: gasLimit,
        fee: bnOrZero(txFee).times(`1e+${asset?.precision}`).toString(),
      },
      value: bnOrZero(cryptoAmount).times(`1e+${asset?.precision}`).toString(),
      action: StakingAction.Unstake,
    })
    setLoading(false)
    if (!broadcastTx) return

    setTxId(broadcastTx)
    setBroadcasted(true)
  }

  return (
    <SlideTransition>
      <ModalCloseButton borderRadius='full' />
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
          <Text color='gray.500' translation={'defi.unstake'} />
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
            {translate('defi.unstakeFrom')}
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
            <Link isExternal color='blue.300' href={`${asset.explorerTxLink}${txId}`}>
              <MiddleEllipsis address={txId} />
            </Link>
          )}
        </Flex>

        <Flex mb='6px' mt='6px' width='100%' justifyContent='space-between'>
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

        <Flex width='100%' flexDirection='column' alignItems='flex-end'>
          <Button
            isLoading={loading}
            loadingText={translate('defi.modals.staking.unstakingYourTokens')}
            colorScheme={'blue'}
            minWidth='150px'
            mb='10px'
            mt='25px'
            size='lg'
            type='submit'
            fontWeight='normal'
          >
            <Text translation={broadcasted ? 'modals.status.close' : 'defi.confirmAndBroadcast'} />
          </Button>
        </Flex>
      </Flex>
    </SlideTransition>
  )
}
