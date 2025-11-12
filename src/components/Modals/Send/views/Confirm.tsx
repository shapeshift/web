import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Box,
  Button,
  Text as CText,
  Divider,
  Flex,
  HStack,
  Icon,
  Input,
  Link,
  Skeleton,
  Stack,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { TbArrowsSplit2 } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import { useLongPress } from 'use-long-press'

import { SendGasSelection } from '../components/SendGasSelection'
import type { SendInput } from '../Form'
import { useSendFees } from '../hooks/useSendFees/useSendFees'
import { SendFormFields, SendRoutes } from '../SendCommon'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { AnimatedDots } from '@/components/Modals/Send/components/AnimatedDots'
import { useSendDetails } from '@/components/Modals/Send/hooks/useSendDetails/useSendDetails'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { getConfig } from '@/config'
import { defaultLongPressConfig } from '@/constants/longPress'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { isMobile } from '@/lib/globals'
import { middleEllipsis } from '@/lib/utils'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { vibrate } from '@/lib/vibrate'
import {
  selectExternalAddressBookEntryByAddress,
  selectInternalAccountIdByAddress,
} from '@/state/slices/addressBookSlice/selectors'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioAccountMetadata,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type FeePrice = {
  [key in FeeDataKey]: {
    fiatFee: string
    txFee: string
    gasPriceGwei?: string
  }
}

const accountDropdownButtonProps = { variant: 'ghost', height: 'auto', p: 0, size: 'md' }

const LONG_PRESS_SECONDS_THRESHOLD = 2000

export type ConfirmProps = {
  handleSubmit: () => void
}

export const Confirm = ({ handleSubmit }: ConfirmProps) => {
  const {
    control,
    formState: { isSubmitting },
    setValue,
  } = useFormContext<SendInput>()
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    accountId,
    to,
    assetId,
    amountCryptoPrecision,
    feeType,
    fiatAmount,
    memo,
    vanityAddress,
    changeAddress,
  } = useWatch({
    control,
  }) as Partial<SendInput>
  const { fees } = useSendFees()
  const { isLoading } = useSendDetails()
  const allowCustomSendNonce = getConfig().VITE_EXPERIMENTAL_CUSTOM_SEND_NONCE
  const toBg = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))
  const networkIcon = feeAsset?.networkIcon ?? feeAsset?.icon
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const {
    state: { wallet },
  } = useWallet()

  const addressBookEntryFilter = useMemo(
    () => ({ accountAddress: to, chainId: asset?.chainId }),
    [to, asset?.chainId],
  )
  const addressBookEntry = useAppSelector(state =>
    selectExternalAddressBookEntryByAddress(state, addressBookEntryFilter),
  )

  const internalAccountIdFilter = useMemo(
    () => ({
      accountAddress: to,
      chainId: asset?.chainId,
    }),
    [to, asset?.chainId],
  )

  const internalAccountId = useAppSelector(state =>
    selectInternalAccountIdByAddress(state, internalAccountIdFilter),
  )

  const accountMetadata = useAppSelector(selectPortfolioAccountMetadata)

  const accountNumber = useMemo(
    () =>
      internalAccountId
        ? accountMetadata[internalAccountId]?.bip44Params?.accountNumber
        : undefined,
    [accountMetadata, internalAccountId],
  )

  const internalAccountLabel = useMemo(() => {
    if (!internalAccountId) return null

    if (isUtxoAccountId(internalAccountId)) {
      return accountIdToLabel(internalAccountId)
    }

    if (accountNumber === undefined) return

    return translate('accounts.accountNumber', { accountNumber })
  }, [internalAccountId, accountNumber, translate])

  const displayDestinationContent = useMemo(() => {
    if (vanityAddress) {
      return (
        <>
          <CText fontSize='2xl' fontWeight='bold'>
            {vanityAddress}
          </CText>
          <InlineCopyButton value={to ?? ''}>
            <MiddleEllipsis
              value={to?.replace('bitcoincash:', '') ?? ''}
              fontSize='sm'
              color='text.subtle'
              fontWeight='normal'
            />
          </InlineCopyButton>
        </>
      )
    }

    if (addressBookEntry) {
      return (
        <>
          <CText fontSize='2xl' fontWeight='bold'>
            {addressBookEntry.label}
          </CText>
          <InlineCopyButton value={to ?? ''}>
            <MiddleEllipsis
              value={to?.replace('bitcoincash:', '') ?? ''}
              fontSize='sm'
              color='text.subtle'
              fontWeight='normal'
            />
          </InlineCopyButton>
        </>
      )
    }

    if (internalAccountLabel) {
      return (
        <>
          <CText fontSize='2xl' fontWeight='bold'>
            {internalAccountLabel}
          </CText>
          <InlineCopyButton value={to ?? ''}>
            <MiddleEllipsis
              value={to?.replace('bitcoincash:', '') ?? ''}
              fontSize='sm'
              color='text.subtle'
              fontWeight='normal'
            />
          </InlineCopyButton>
        </>
      )
    }

    return (
      <InlineCopyButton value={to ?? ''}>
        <MiddleEllipsis value={to ?? ''} fontSize='2xl' fontWeight='bold' />
      </InlineCopyButton>
    )
  }, [vanityAddress, addressBookEntry, internalAccountLabel, to])

  const showMemoRow = useMemo(
    () => Boolean(assetId && fromAssetId(assetId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk),
    [assetId],
  )

  const shouldShowChangeAddress = useMemo(
    () =>
      Boolean(
        assetId &&
          fromAssetId(assetId).chainNamespace === CHAIN_NAMESPACE.Utxo &&
          wallet &&
          isLedger(wallet),
      ),
    [assetId, wallet],
  )

  const avatarUrl = useMemo(
    () =>
      addressBookEntry && addressBookEntry.isExternal
        ? makeBlockiesUrl(addressBookEntry.address)
        : makeBlockiesUrl(to ?? ''),
    [addressBookEntry, to],
  )

  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const handleNonceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setValue(SendFormFields.CustomNonce, value)
    },
    [setValue],
  )

  const handleBack = useCallback(() => navigate(SendRoutes.AmountDetails), [navigate])

  // We don't want this firing -- but need it for typing
  const handleAccountChange = useCallback(() => {}, [])

  const assetMemoTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.send.sendForm.assetMemo', { assetSymbol: asset?.symbol ?? '' }],
    [asset],
  )

  const chainName = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    const chainName = chainAdapterManager.get(asset?.chainId ?? '')?.getDisplayName()
    return chainName
  }, [asset?.chainId])

  const [isLongPressing, setIsLongPressing] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isLongPressing) return

    const startTime = Date.now()

    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const progressPercent = Math.min((elapsed / LONG_PRESS_SECONDS_THRESHOLD) * 100, 100)
      setProgress(progressPercent)

      if (progressPercent < 100) {
        requestAnimationFrame(updateProgress)
      }
    }

    requestAnimationFrame(updateProgress)
  }, [isLongPressing])

  const longPressHandlers = useLongPress(
    () => {
      vibrate('heavy')
      setIsLongPressing(false)
      setProgress(0)
      handleSubmit()
    },
    {
      ...defaultLongPressConfig,
      threshold: LONG_PRESS_SECONDS_THRESHOLD,
      cancelOnMovement: 25,
      onCancel: () => {
        setIsLongPressing(false)
        setProgress(0)
      },
      onStart: () => {
        vibrate('light')
        setIsLongPressing(true)
        setProgress(0)
      },
    },
  )

  if (!(to && asset?.name && amountCryptoPrecision && fiatAmount && feeType)) return null

  return (
    <SlideTransition className='flex flex-col h-full'>
      <DialogHeader>
        <DialogBackButton onClick={handleBack} />
        <DialogTitle textAlign='center'>
          <Text translation='modals.send.confirmSend' />
        </DialogTitle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <Flex
          width='full'
          bg='background.surface.raised.base'
          py={4}
          pb={6}
          px={6}
          borderRadius='2xl'
          border='1px solid'
          borderColor='border.base'
          mb={6}
          alignItems='stretch'
        >
          <Box width='full' flex={1}>
            <Amount.Fiat
              fontSize='2xl'
              fontWeight='bold'
              lineHeight='shorter'
              textTransform='uppercase'
              value={fiatAmount}
            />
            <Amount.Crypto
              symbol={asset.symbol}
              value={amountCryptoPrecision}
              color='text.subtle'
              fontSize='sm'
              lineHeight='short'
            />
            <Flex alignItems='center' gap={2} width='100%' my={4}>
              <Text
                translation='trade.to'
                fontSize='sm'
                backgroundColor={toBg}
                px={1}
                py={0}
                borderRadius='md'
                me={0}
                textTransform='lowercase'
              />
              <Divider width='100%' height='1px' backgroundColor='border.base' />
            </Flex>
            <Box>
              <Tooltip label={to} shouldWrapChildren lineHeight='short'>
                {displayDestinationContent}
              </Tooltip>
            </Box>
          </Box>
          <Flex
            flexDirection='column'
            gap={4}
            bg={'background.surface.raised.base'}
            border='1px solid'
            borderColor='border.base'
            borderRadius='full'
            justifyContent='space-between'
            position='relative'
          >
            <AssetIcon assetId={asset.assetId} position='relative' zIndex={2} size='md' />
            <Box
              position='absolute'
              left={'50%'}
              top='50%'
              transform='translate(-50%, -50%)'
              zIndex={1}
              height='55px'
            >
              <AnimatedDots />
            </Box>
            <Avatar src={avatarUrl} size='md' flexShrink={0} />
          </Flex>
        </Flex>
        <Stack spacing={4} mb={6} px={4}>
          <Row flexWrap='wrap'>
            <Row.Label>
              <Text translation={'modals.send.sendForm.chain'} />
            </Row.Label>
            <Row.Value fontSize={'md'} display='flex' alignItems='center'>
              <CText>{chainName}</CText>
              <LazyLoadAvatar src={networkIcon} size='xs' ml={2} />
            </Row.Value>
          </Row>
          <Row alignItems='center'>
            <Row.Label>
              <Text translation='trade.from' />
            </Row.Label>
            <Row.Value display='flex' alignItems='center'>
              <InlineCopyButton
                isDisabled={!accountId || isUtxoAccountId(accountId)}
                value={accountId ? fromAccountId(accountId).account : ''}
              >
                <AccountDropdown
                  onChange={handleAccountChange}
                  assetId={asset.assetId}
                  defaultAccountId={accountId}
                  buttonProps={accountDropdownButtonProps}
                  disabled
                />
              </InlineCopyButton>
            </Row.Value>
          </Row>
          {shouldShowChangeAddress && (
            <Row alignItems='center'>
              <Row.Label>
                <HelperTooltip label={translate('trade.changeAddressExplainer')}>
                  <HStack spacing={2}>
                    <Icon as={TbArrowsSplit2} />
                    <Text translation='trade.changeAddress' />
                  </HStack>
                </HelperTooltip>
              </Row.Label>
              <Row.Value>
                {changeAddress ? (
                  <HStack>
                    <TooltipWithTouch label={changeAddress}>
                      <RawText>{middleEllipsis(changeAddress)}</RawText>
                    </TooltipWithTouch>
                    <Link
                      href={`${asset?.explorerAddressLink}${changeAddress}`}
                      isExternal
                      aria-label={translate('common.viewOnExplorer')}
                    >
                      <Icon as={ExternalLinkIcon} />
                    </Link>
                  </HStack>
                ) : isSubmitting ? (
                  <Skeleton height='20px' width='150px' />
                ) : (
                  <Text color='text.subtle' translation='modals.send.confirm.pendingConfirmation' />
                )}
              </Row.Value>
            </Row>
          )}
          {allowCustomSendNonce && (
            <Row>
              <Row.Label>
                <Text translation={'modals.send.confirm.customNonce'} />
              </Row.Label>
              <Row.Value>
                <Input
                  onChange={handleNonceChange}
                  type='text'
                  placeholder={''}
                  pl={10}
                  variant='filled'
                />
              </Row.Value>
            </Row>
          )}
          {showMemoRow && (
            <Row>
              <Row.Label>
                <Text translation={assetMemoTranslation} />
              </Row.Label>
              <Row.Value>
                <RawText>{memo}</RawText>
              </Row.Value>
            </Row>
          )}
        </Stack>
      </DialogBody>
      <DialogFooter
        flexDirection='column'
        borderTopWidth={1}
        borderColor={borderColor}
        pt={4}
        borderRight='1px solid'
        borderRightColor='border.base'
        borderLeft='1px solid'
        borderLeftColor='border.base'
        borderTopRadius='20'
      >
        <SendGasSelection />
        <Button
          colorScheme='blue'
          isDisabled={!fees || isSubmitting || isLoading}
          isLoading={isSubmitting || isLoading}
          loadingText={isLoading ? undefined : translate('modals.send.broadcastingTransaction')}
          size='lg'
          mt={6}
          type={isMobile ? 'button' : 'submit'}
          width='full'
          position='relative'
          overflow='hidden'
          {...(isMobile ? longPressHandlers() : {})}
        >
          {isLongPressing && (
            <Box
              position='absolute'
              top='0'
              left='0'
              height='100%'
              width={`${progress}%`}
              bg='whiteAlpha.300'
              transition='width 0.1s ease-out'
              zIndex={1}
            />
          )}

          <Box position='relative' zIndex={2}>
            <Text translation={isMobile ? 'modals.send.confirm.holdToSend' : 'common.confirm'} />
          </Box>
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
