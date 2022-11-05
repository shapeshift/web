import { Button } from '@chakra-ui/button'
import { Box, Link, Stack, Text as CText } from '@chakra-ui/layout'
import { Divider, Icon, Switch, Tooltip, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import isUndefined from 'lodash/isUndefined'
import { FaExchangeAlt } from 'react-icons/fa'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import { PairIcons } from './PairIcons'

type ApproveProps = {
  asset: Asset
  disabled?: boolean
  providerIcon?: string
  icons?: string[]
  feeAsset: Asset
  cryptoEstimatedGasFee: string
  fiatEstimatedGasFee: string
  isExactAllowance?: boolean
  learnMoreLink?: string
  loading: boolean
  loadingText?: string
  contractAddress: string
  preFooter?: React.ReactNode
  onToggle?(): void
  onConfirm(): Promise<void>
  onCancel(): void
}

export const Approve = ({
  asset,
  contractAddress,
  cryptoEstimatedGasFee,
  disabled,
  feeAsset,
  fiatEstimatedGasFee,
  icons,
  isExactAllowance,
  learnMoreLink,
  loading,
  loadingText,
  onCancel,
  onConfirm,
  onToggle,
  preFooter,
  providerIcon,
}: ApproveProps) => {
  const translate = useTranslate()

  const bgColor = useColorModeValue('gray.50', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  return (
    <Stack
      bg={bgColor}
      borderColor={borderColor}
      borderRadius='xl'
      borderWidth={1}
      divider={<Divider />}
    >
      <Stack flex={1} spacing={6} p={4} textAlign='center'>
        <Stack
          spacing={4}
          direction='row'
          alignItems='center'
          justifyContent='center'
          color='gray.500'
          pt={6}
        >
          {icons ? <PairIcons icons={icons} /> : <AssetIcon src={asset.icon} size='md' />}
          {providerIcon && (
            <>
              <FaExchangeAlt />
              <AssetIcon src={providerIcon} size='md' />
            </>
          )}
        </Stack>
        <Stack>
          <Text fontWeight='bold' translation={['modals.approve.header', { asset: asset.name }]} />
          <CText color='gray.500'>
            <Link
              href={`${asset.explorerAddressLink}${contractAddress}`}
              color='blue.500'
              me={1}
              isExternal
            >
              {translate('modals.approve.routerName')}
            </Link>
            {translate('modals.approve.body', { asset: asset.name })}
          </CText>
          <Link color='blue.500' href={learnMoreLink} isExternal>
            {translate('modals.approve.learnMore')}
          </Link>
        </Stack>
        {/* Because isExactAllowance is not used everywhere yet, we need to make it optional and
        check if it is defined because it's a boolean */}
        {!isUndefined(isExactAllowance) && (
          <Row justifyContent='space-between'>
            <Row.Label display='flex' alignItems='center'>
              <Text color='gray.500' translation='trade.allowance' />
              <Tooltip label={translate('trade.allowanceTooltip')}>
                <Box ml={1}>
                  <Icon as={FaInfoCircle} color='gray.500' fontSize='0.7em' />
                </Box>
              </Tooltip>
            </Row.Label>
            <Row.Value textAlign='right' display='flex' alignItems='center'>
              <Text
                color={isExactAllowance ? 'gray.500' : 'white'}
                translation='trade.unlimited'
                fontWeight='bold'
              />
              <Switch size='sm' mx={2} isChecked={isExactAllowance} onChange={onToggle} />
              <Text
                color={isExactAllowance ? 'white' : 'gray.500'}
                translation='trade.exact'
                fontWeight='bold'
              />
            </Row.Value>
          </Row>
        )}
        <Stack justifyContent='space-between'>
          <Button
            onClick={() => (isConnected ? onConfirm() : handleWalletModalOpen())}
            disabled={disabled}
            size='lg'
            colorScheme='blue'
            width='full'
            data-test='defi-modal-approve-button'
            isLoading={loading}
            loadingText={loadingText}
          >
            {translate('modals.approve.confirm')}
          </Button>
          <Button onClick={onCancel} size='lg' width='full' colorScheme='gray' isDisabled={loading}>
            {translate('modals.approve.reject')}
          </Button>
        </Stack>
      </Stack>
      <Stack p={4}>
        {preFooter}
        <Row>
          <Row.Label>{translate('modals.approve.estimatedGas')}</Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat value={fiatEstimatedGasFee} />
              <Amount.Crypto
                color='gray.500'
                value={cryptoEstimatedGasFee}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Stack>
    </Stack>
  )
}
