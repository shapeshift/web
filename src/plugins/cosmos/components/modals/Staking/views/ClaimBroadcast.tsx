import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import { Button, Link, Text as CText, Tooltip } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import {
  StakingAction,
  StakingValues,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ClaimBroadcastProps = {
  assetId: AssetId
  validatorAddress: string
  onClose: () => void
  onStepCompleted: () => void
}

export enum Field {
  FeeType = 'feeType',
}

export const ClaimBroadcast = ({
  assetId,
  validatorAddress,
  onClose,
  onStepCompleted,
}: ClaimBroadcastProps) => {
  const [loading, setLoading] = useState(true)
  const [txId, setTxId] = useState<string | null>(null)

  const { handleStakingAction } = useStakingAction()

  const methods = useFormContext<StakingValues>()
  const { control } = methods
  const { txFee, fiatFee, gasLimit, cryptoAmount } = useWatch({ control })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // TODO(gomes): This currently fires the broadcat once on component mount. Move this to something like useFormSend
  // We will also need to listen to incoming Txs (which are currently not coming from the websocket) to determine broadcasted
  // state and react on broadcast errors instead of being optimistic
  useEffect(() => {
    ;(async () => {
      // Satisfying react-hook-form typings, gasLimit should always be defined on initial render after the useWatch hook runs
      if (!gasLimit) return
      const broadcastTx = await handleStakingAction({
        asset,
        validator: validatorAddress,
        chainSpecific: {
          gas: gasLimit,
          fee: bnOrZero(txFee).times(`1e+${asset?.precision}`).toString(),
        },
        action: StakingAction.Claim,
      })

      if (!broadcastTx) return

      setTxId(broadcastTx)
      setLoading(false)
      onStepCompleted()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const translate = useTranslate()

  if (!txFee || !fiatFee || !gasLimit || !cryptoAmount) return null

  return (
    <SlideTransition>
      <Flex
        as='form'
        pt='14px'
        pb='18px'
        px='30px'
        flexDirection='column'
        alignItems='center'
        justifyContent='space-between'
      >
        <Flex width='100%' mb='20px' justifyContent='space-between'>
          <Text color='gray.500' translation={'defi.modals.claim.rewardAmount'} />
          <Flex flexDirection='column' alignItems='flex-end'>
            <Amount.Fiat
              fontWeight='semibold'
              value={bnOrZero(cryptoAmount)
                .div(`1e+${asset.precision}`)
                .times(marketData.price)
                .toString()}
            />
            <Amount.Crypto
              color='gray.500'
              value={bnOrZero(cryptoAmount).div(`1e+${asset.precision}`).toString()}
              symbol={asset.symbol}
            />
          </Flex>
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
            <Amount.Fiat value={bnOrZero(fiatFee).toString()} />
            <Amount.Crypto
              value={bnOrZero(txFee).toString()}
              symbol={asset.symbol}
              color='gray.500'
            />
          </Flex>
        </Flex>

        <Flex width='100%' flexDirection='column' alignItems='flex-end'>
          <Button
            isLoading={loading}
            onClick={onClose}
            loadingText={translate('defi.modals.staking.claimingRewards')}
            colorScheme={'blue'}
            minWidth='150px'
            mb='10px'
            mt='25px'
            size='lg'
          >
            <Text translation={'modals.status.close'} />
          </Button>
        </Flex>
      </Flex>
    </SlideTransition>
  )
}
