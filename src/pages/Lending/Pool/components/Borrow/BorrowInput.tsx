import { ArrowDownIcon } from '@chakra-ui/icons'
import { Button, CardFooter, Collapse, Divider, Flex, IconButton, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { btcAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import type { Asset } from 'lib/asset-service'

import { LoanSummary } from '../LoanSummary'
import { BorrowRoutePaths } from './types'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

export const BorrowInput = () => {
  const translate = useTranslate()
  const history = useHistory()
  const onSubmit = useCallback(() => {
    history.push(BorrowRoutePaths.Confirm)
  }, [history])

  const swapIcon = useMemo(() => <ArrowDownIcon />, [])

  const percentOptions = useMemo(() => [0], [])

  const handleAccountIdChange = useCallback((accountId: AccountId) => {
    console.info(accountId)
  }, [])

  const handleAssetClick = useCallback(() => {
    console.info('clicked Asset')
  }, [])

  const handleAssetChange = useCallback((asset: Asset) => {
    return console.info(asset)
  }, [])
  const assetSelectComponent = useMemo(() => {
    return (
      <TradeAssetSelect
        accountId={''}
        assetId={btcAssetId}
        onAssetClick={handleAssetClick}
        onAccountIdChange={handleAccountIdChange}
        accountSelectionDisabled={false}
        label={'uhh'}
        onAssetChange={handleAssetChange}
        isReadOnly
      />
    )
  }, [handleAccountIdChange, handleAssetChange, handleAssetClick])
  return (
    <SlideTransition>
      <Stack spacing={0}>
        <TradeAssetInput
          assetId={btcAssetId}
          assetSymbol={'btc'}
          assetIcon={''}
          cryptoAmount={'0'}
          fiatAmount={'0'}
          isSendMaxDisabled={false}
          percentOptions={percentOptions}
          showInputSkeleton={false}
          showFiatSkeleton={false}
          label={'Deposit BTC'}
          onAccountIdChange={handleAccountIdChange}
          formControlProps={formControlProps}
          layout='inline'
          labelPostFix={assetSelectComponent}
        />
        <Flex alignItems='center' justifyContent='center' my={-2}>
          <Divider />
          <IconButton
            isRound
            size='sm'
            position='relative'
            variant='outline'
            borderColor='border.base'
            zIndex={1}
            aria-label='Switch Assets'
            icon={swapIcon}
          />
          <Divider />
        </Flex>
        <TradeAssetInput
          assetId={btcAssetId}
          assetSymbol={'btc'}
          assetIcon={''}
          cryptoAmount={'0'}
          fiatAmount={'0'}
          isSendMaxDisabled={false}
          percentOptions={percentOptions}
          showInputSkeleton={false}
          showFiatSkeleton={false}
          label={'Borrow'}
          onAccountIdChange={handleAccountIdChange}
          formControlProps={formControlProps}
          layout='inline'
          labelPostFix={assetSelectComponent}
        />
        <Collapse in={true}>
          <LoanSummary />
        </Collapse>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          py={4}
          bg='background.surface.raised.accent'
          borderBottomRadius='xl'
        >
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.slippage')}</Row.Label>
            <Row.Value>
              <Amount.Crypto value='20' symbol='BTC' />
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Amount.Fiat value='10' />
            </Row.Value>
          </Row>
          <Row fontSize='sm' fontWeight='medium'>
            <Row.Label>{translate('common.fees')}</Row.Label>
            <Row.Value>
              <Amount.Fiat value='0' />
            </Row.Value>
          </Row>
          <Button size='lg' colorScheme='blue' mx={-2} onClick={onSubmit}>
            Borrow
          </Button>
        </CardFooter>
      </Stack>
    </SlideTransition>
  )
}
