import { ArrowDownIcon, WarningIcon } from '@chakra-ui/icons'
import { Avatar, Box, Button, Divider, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { Address } from 'components/TransactionHistoryRows/TransactionDetails/Address'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'

type DustProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Dust: React.FC<DustProps> = () => {
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const handleBack = useCallback(() => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, location.pathname, query])

  const handleConfirm = useCallback(() => {
    mixpanel?.track(MixPanelEvents.DustConfirm)
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Withdraw,
      }),
    })
  }, [history, location.pathname, mixpanel, query])

  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', md: '500px' }}
      maxWidth={{ base: 'full', md: '500px' }}
      flexDir='column'
    >
      <DefiModalHeader title={translate('defi.modals.saversVaults.sendDust')} onBack={handleBack} />
      <Stack spacing={0} divider={<Divider />}>
        <Row variant='vert-gutter' gap={2} alignItems='center'>
          <Row.Label>
            <Avatar
              icon={<ArrowDownIcon />}
              colorScheme='blue'
              bg={useColorModeValue('gray.200', 'gray.700')}
              color={useColorModeValue('blue.500', 'blue.200')}
            >
              <WarningIcon
                position='absolute'
                color={useColorModeValue('yellow.500', 'yellow.200')}
                right={0}
                top={0}
              />
            </Avatar>
          </Row.Label>
          <Row.Value textAlign='center'>
            <Text fontWeight='medium' translation='defi.modals.saversVaults.sendDustBody' />
          </Row.Value>
        </Row>
        <Row variant='vert-gutter' alignItems='center' gap={0} py={8}>
          <Row.Value>
            <Amount.Crypto fontSize='3xl' value='0.01' symbol='BTC' />
          </Row.Value>
          <Row.Label>
            <Amount.Fiat fontSize='2xl' value='5.00' color='gray.500' prefix='≈' />
          </Row.Label>
        </Row>
        <Summary bg='transparent' borderWidth={0} px={8} py={6} divider={<></>}>
          <Row variant='gutter' px={0}>
            <Row.Label>{translate('defi.modals.saversVaults.addressToSendTo')}</Row.Label>
            <Row.Value fontSize='md'>
              <Address explorerAddressLink='https://etherscan.io/address/' address='0000' />
            </Row.Value>
          </Row>
          <Row variant='gutter' px={0}>
            <Row.Label>{translate('defi.modals.saversVaults.protocolFee')}</Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat fontWeight='bold' value='0' />
                <Amount.Crypto color='gray.500' value='0' symbol='BTC' />
              </Box>
            </Row.Value>
          </Row>
          <Stack width='full' direction='row'>
            <Button size='lg' colorScheme='gray' width='full' onClick={handleBack}>
              {translate('modals.confirm.cancel')}
            </Button>
            <Button
              size='lg'
              width='full'
              colorScheme='blue'
              data-test='defi-modal-send-dust-confirm'
              onClick={handleConfirm}
            >
              {translate('defi.modals.saversVaults.sendDust')}
            </Button>
          </Stack>
        </Summary>
      </Stack>
    </Flex>
  )
}
