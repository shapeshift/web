import { ArrowDownIcon } from '@chakra-ui/icons'
import { Button, Divider, Flex, IconButton, Stack } from '@chakra-ui/react'
import { btcAssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'

import { LoanSummary } from '../LoanSummary'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

export const RepayInput = () => {
  const translate = useTranslate()
  return (
    <Stack spacing={0}>
      <TradeAssetInput
        assetId={btcAssetId}
        assetSymbol={'btc'}
        assetIcon={''}
        cryptoAmount={'0'}
        fiatAmount={'0'}
        isSendMaxDisabled={false}
        percentOptions={[0]}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={'Repay Amount'}
        onAccountIdChange={() => console.info('blam')}
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={
          <TradeAssetSelect
            accountId={''}
            assetId={usdcAssetId}
            onAssetClick={() => console.info('clicked asset')}
            onAccountIdChange={() => console.info('changed account')}
            accountSelectionDisabled={false}
            label={'uhh'}
            onAssetChange={() => console.info('asset change')}
          />
        }
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
          icon={<ArrowDownIcon />}
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
        percentOptions={[0]}
        showInputSkeleton={false}
        showFiatSkeleton={false}
        label={'Unlocked Collateral'}
        onAccountIdChange={() => console.info('blam')}
        formControlProps={formControlProps}
        layout='inline'
        labelPostFix={
          <TradeAssetSelect
            accountId={''}
            assetId={btcAssetId}
            onAssetClick={() => console.info('clicked asset')}
            onAccountIdChange={() => console.info('changed account')}
            accountSelectionDisabled={false}
            label={'uhh'}
            onAssetChange={() => console.info('asset change')}
            isReadOnly
          />
        }
      />
      <LoanSummary show />
      <Stack
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
        <Button size='lg' colorScheme='blue' mx={-2}>
          {translate('lending.repay')}
        </Button>
      </Stack>
    </Stack>
  )
}
