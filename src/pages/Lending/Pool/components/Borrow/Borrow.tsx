import { ArrowDownIcon } from '@chakra-ui/icons'
import { Button, Divider, Flex, IconButton, Stack } from '@chakra-ui/react'
import { btcAssetId } from '@shapeshiftoss/caip'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { RawText } from 'components/Text'

import { LoanSummary } from './LoanSummary'
const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
}

export const Borrow = () => {
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
        label={'Deposit BTC'}
        onAccountIdChange={() => console.info('blam')}
        formControlProps={formControlProps}
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
        label={'Borrow'}
        onAccountIdChange={() => console.info('blam')}
        formControlProps={formControlProps}
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
        <Button size='lg' colorScheme='blue' mx={-2}>
          Borrow
        </Button>
      </Stack>
    </Stack>
  )
}
