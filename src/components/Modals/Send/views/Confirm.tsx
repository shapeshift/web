import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  useColorModeValue
} from '@chakra-ui/react'
import { FeeDataKey, FeeDataType } from '@shapeshiftoss/chain-adapters'
import { getAssetData } from '@shapeshiftoss/market-service'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber'
import { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { SendRoutes } from '../Send'
import { TxFeeRadioGroup } from '../TxFeeRadioGroup'

export type FeePrice = {
  [key in FeeDataKey]: {
    fee: string
    amount: string
  } & FeeDataType
}

export const Confirm = () => {
  const [fees, setFees] = useState<FeePrice | null>(null)
  const { control } = useFormContext()
  const history = useHistory()
  const translate = useTranslate()
  const { address, asset, crypto, fiat, transaction, fee: feeType } = useWatch({ control })
  const {
    state: { wallet }
  } = useWallet()

  const chainAdapter = useChainAdapters()
  // const marketData = useMarketData()

  useEffect(() => {
    /**
     * This still fees pretty ETH specific, setting up the fees for additional chains
     * will probably require refactoring.
     * Note: Probably should move into separate hook to consolidate logic and make easier to test
     */
    const adapter = chainAdapter.byChain(asset?.network)
    ;(async () => {
      if (wallet) {
        // TODO (technojak) get path from asset service
        const path = "m/44'/60'/0'/0/0"
        const fromAddress = await adapter.getAddress({ wallet, path })
        /**
         * TODO (technojak) when using the asset service check if ERC20 and default to eth precision
         * Asset service will use tokenId vs contractAddress. Also important to note that asset service has
         * a contract type
         */
        const precision = asset?.contractAddress ? 18 : asset.decimals
        const adapterFees = await adapter.getFeeData({
          to: transaction.to,
          from: fromAddress,
          value: transaction.value,
          contractAddress: asset?.contractAddress
        })
        const feeMarketData = await getAssetData(asset?.network)

        const txFees = (Object.keys(adapterFees) as FeeDataKey[]).reduce(
          (acc: FeePrice, key: FeeDataKey) => {
            const current = adapterFees[key]
            const fee = bnOrZero(current.networkFee).div(`1e${precision}`).toPrecision()
            // NEED MARKET PRICE
            const amount = bnOrZero(fee).times(bnOrZero(feeMarketData?.price)).toPrecision()
            acc[key] = { ...current, fee, amount }
            return acc
          },
          {} as FeePrice
        )
        setFees(txFees)
      }
    })()
    // We only want this effect to run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const amountWithFees = useMemo(() => {
    const { amount } = fees ? fees[feeType as FeeDataKey] : { amount: 0 }
    return bnOrZero(fiat.amount).plus(amount).toString()
  }, [fiat.amount, fees, feeType])

  return (
    <SlideTransition>
      <ModalHeader textAlign='center'>
        <Text translation={['modals.send.confirm.sendAsset', { asset: asset.name }]} />
      </ModalHeader>
      <ModalBody>
        <Flex flexDir='column' alignItems='center' mb={8}>
          <Amount.Crypto
            fontSize='4xl'
            fontWeight='bold'
            lineHeight='shorter'
            textTransform='uppercase'
            symbol={crypto.symbol}
            value={crypto.amount}
          />
          <Amount.Fiat color='gray.500' fontSize='xl' lineHeight='short' value={fiat.amount} />
        </Flex>
        <Stack spacing={4} mb={4}>
          <Row>
            <Row.Label>
              <Text translation={'modals.send.confirm.sendTo'} />
            </Row.Label>
            <Row.Value>
              <MiddleEllipsis maxWidth='260px'>{address}</MiddleEllipsis>
            </Row.Value>
          </Row>
          <FormControl mt={4}>
            <Row variant='vertical'>
              <Row.Label>
                <FormLabel color='gray.500' htmlFor='tx-fee'>
                  {translate('modals.send.sendForm.transactionFee')}
                </FormLabel>
              </Row.Label>
              <TxFeeRadioGroup fees={fees} />
            </Row>
          </FormControl>
          <Button width='full' onClick={() => history.push(SendRoutes.Details)}>
            <Text translation={'modals.send.confirm.edit'} />
          </Button>
        </Stack>
      </ModalBody>
      <ModalFooter
        flexDir='column'
        borderTopWidth={1}
        borderColor={useColorModeValue('gray.100', 'gray.750')}
      >
        <Row>
          <Box>
            <Row.Label color='inherit' fontWeight='bold'>
              <Text translation='modals.send.confirm.total' />
            </Row.Label>
            <Row.Label flexDir='row' display='flex'>
              <Text translation='modals.send.confirm.amount' />
              <RawText mx={1}>+</RawText>
              <Text translation='modals.send.confirm.transactionFee' />
            </Row.Label>
          </Box>
          <Box textAlign='right'>
            <Row.Value>
              <Amount.Crypto
                textTransform='uppercase'
                maximumFractionDigits={4}
                symbol={crypto.symbol}
                value={crypto.amount}
              />
            </Row.Value>
            <Row.Label>
              <Amount.Fiat value={amountWithFees} />
            </Row.Label>
          </Box>
        </Row>
        <Button colorScheme='blue' size='lg' width='full' mt={6} type='submit'>
          <Text translation='common.confirm' />
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
