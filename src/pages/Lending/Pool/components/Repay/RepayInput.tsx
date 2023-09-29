import { ArrowDownIcon, WarningIcon } from '@chakra-ui/icons'
import {
  Button,
  Collapse,
  Divider,
  Flex,
  Heading,
  IconButton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import { btcAssetId } from '@shapeshiftoss/caip'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'

import { LoanSummary } from '../LoanSummary'
import { RepayRoutePaths } from './types'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

export const RepayInput = () => {
  const [seenNotice, setSeenNotice] = useState(false)
  const translate = useTranslate()
  const history = useHistory()

  const onSubmit = useCallback(() => {
    history.push(RepayRoutePaths.Confirm)
  }, [history])

  if (!seenNotice) {
    return (
      <Stack spacing={6} px={4} py={6} textAlign='center' alignItems='center'>
        <WarningIcon color='text.warning' boxSize={12} />
        <Stack spacing={0} px={2}>
          <Heading as='h4'>{translate('lending.repayNoticeTitle')}</Heading>
          <Text color='text.subtle' translation='lending.repayNotice' />
        </Stack>
        <Button width='full' size='lg' colorScheme='blue' onClick={() => setSeenNotice(true)}>
          {translate('lending.repayNoticeCta')}
        </Button>
      </Stack>
    )
  }
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
      >
        <Stack spacing={4} px={6} pb={4}>
          <Slider defaultValue={100} isReadOnly>
            <SliderTrack>
              <SliderFilledTrack bg='blue.500' />
            </SliderTrack>
            <Tooltip label={translate('lending.repayNotice')}>
              <SliderThumb boxSize={4} />
            </Tooltip>
          </Slider>
          <Flex width='full' justifyContent='space-between' fontSize='xs' color='text.subtle'>
            <Amount.Fiat value={0} />
            <Amount.Fiat value='14820' />
          </Flex>
        </Stack>
      </TradeAssetInput>
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
      <Collapse in={true}>
        <LoanSummary />
      </Collapse>
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
        <Button size='lg' colorScheme='blue' mx={-2} onClick={onSubmit}>
          {translate('lending.repay')}
        </Button>
      </Stack>
    </Stack>
  )
}
