import {
  Box,
  Button,
  Divider,
  Icon,
  Link,
  Stack,
  Switch,
  Text as CText,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import isUndefined from 'lodash/isUndefined'
import { FaExchangeAlt, FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'

import { PairIcons } from './PairIcons'

type ApproveProps = {
  asset: Asset
  spenderName: string
  disabled?: boolean
  providerIcon?: string
  icons?: string[]
  feeAsset: Asset
  estimatedGasFeeCryptoPrecision: string
  fiatEstimatedGasFee: string
  isExactAllowance?: boolean
  isApproved?: boolean
  learnMoreLink?: string
  loading: boolean
  loadingText?: string
  spenderContractAddress: string
  preFooter?: React.ReactNode
  onToggle?(): void
  onConfirm(): Promise<void>
  onCancel(): void
}

export const Approve = ({
  asset,
  spenderContractAddress,
  spenderName,
  estimatedGasFeeCryptoPrecision,
  disabled,
  feeAsset,
  fiatEstimatedGasFee,
  icons,
  isApproved,
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
          color='text.subtle'
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
          <Text
            fontWeight='bold'
            translation={['modals.approve.header', { asset: asset.name, spenderName }]}
          />
          <CText color='text.subtle'>
            <Link
              href={`${asset.explorerAddressLink}${spenderContractAddress}`}
              color='blue.500'
              me={1}
              isExternal
            >
              {spenderName}
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
              <Text color='text.subtle' translation='trade.allowance' />
              <Tooltip label={translate('trade.allowanceTooltip')}>
                <Box ml={1}>
                  <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
                </Box>
              </Tooltip>
            </Row.Label>
            <Row.Value textAlign='right' display='flex' alignItems='center'>
              <Text
                color={isExactAllowance ? 'text.subtle' : 'white'}
                translation='trade.unlimited'
                fontWeight='bold'
              />
              <Switch size='sm' mx={2} isChecked={isExactAllowance} onChange={onToggle} />
              <Text
                color={isExactAllowance ? 'white' : 'text.subtle'}
                translation='trade.exact'
                fontWeight='bold'
              />
            </Row.Value>
          </Row>
        )}
        <Stack justifyContent='space-between'>
          <Button
            onClick={() => (isConnected ? onConfirm() : handleWalletModalOpen())}
            disabled={isApproved || disabled || loading}
            size='lg'
            colorScheme={isApproved ? 'green' : 'blue'}
            width='full'
            data-test='defi-modal-approve-button'
            isLoading={loading}
            loadingText={loadingText}
          >
            {translate(!isApproved ? 'common.approve' : 'modals.approve.approved')}
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
                color='text.subtle'
                value={estimatedGasFeeCryptoPrecision}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Stack>
    </Stack>
  )
}
