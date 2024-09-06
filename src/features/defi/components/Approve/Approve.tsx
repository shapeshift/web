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
import type { Asset } from '@shapeshiftoss/types'
import isUndefined from 'lodash/isUndefined'
import { useCallback, useMemo } from 'react'
import { FaExchangeAlt, FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

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
  loading: boolean
  isReset?: boolean
  spenderContractAddress: string
  preFooter?: React.ReactNode
  onToggle?(): void
  onConfirm(): Promise<void>
  onCancel(): void
}

const divider = <Divider />

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
  loading,
  isReset,
  onCancel: handleCancel,
  onConfirm: handleConfirm,
  onToggle: handleToggle,
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

  const handleWalletModalOpen = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )

  const approveHeaderTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      isReset ? 'modals.approve.resetHeader' : 'modals.approve.header',
      { asset: asset.name, spenderName },
    ],
    [asset.name, isReset, spenderName],
  )

  const approveCopy = useMemo(() => {
    if (isReset) return 'common.reset'
    return !isApproved ? 'common.approve' : 'modals.approve.approved'
  }, [isApproved, isReset])

  const learnMoreLink = useMemo(
    () =>
      isReset
        ? // See https://github.com/tethercoin/USDT/blob/c3e3caa95c30e74a0f4f0d616e13ff97daa02191/TetherToken.sol#L204
          'https://docs.google.com/document/d/1YLPtQxZu1UAvO9cZ1O2RPXBbT0mooh4DYKjA_jp-RLM/'
        : 'https://shapeshift.zendesk.com/hc/en-us/articles/360018501700',
    [isReset],
  )

  const handleApproveClick = useCallback(
    () => (isConnected ? handleConfirm() : handleWalletModalOpen()),
    [handleConfirm, handleWalletModalOpen, isConnected],
  )

  return (
    <Stack
      bg={bgColor}
      borderColor={borderColor}
      borderRadius='xl'
      borderWidth={1}
      divider={divider}
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
          <Text fontWeight='bold' translation={approveHeaderTranslation} />
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
        {!isUndefined(isExactAllowance) && !isReset && (
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
              <Switch size='sm' mx={2} isChecked={isExactAllowance} onChange={handleToggle} />
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
            onClick={handleApproveClick}
            disabled={isApproved || disabled || loading}
            size='lg'
            colorScheme={isApproved ? 'green' : 'blue'}
            width='full'
            data-test='defi-modal-approve-button'
            isLoading={loading}
            loadingText={translate(isReset ? 'common.reset' : 'common.approve')}
          >
            {translate(approveCopy)}
          </Button>
          <Button
            onClick={handleCancel}
            size='lg'
            width='full'
            colorScheme='gray'
            isDisabled={loading}
          >
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
