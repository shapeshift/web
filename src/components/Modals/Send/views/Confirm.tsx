import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
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
  useColorModeValue,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { ChangeEvent } from 'react'
import { useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { TbArrowsSplit2 } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { SendInput } from '../Form'
import { useSendFees } from '../hooks/useSendFees/useSendFees'
import { SendFormFields, SendRoutes } from '../SendCommon'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { middleEllipsis } from '@/lib/utils'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'
import { selectAssetById, selectFeeAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { GasSelectionMenu } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/GasSelectionMenu'

export type FeePrice = {
  [key in FeeDataKey]: {
    fiatFee: string
    txFee: string
    gasPriceGwei?: string
  }
}

const accountDropdownButtonProps = { variant: 'ghost', height: 'auto', p: 0, size: 'md' }

// Infinite scroll animation that moves dots down continuously
const infiniteScroll = keyframes`
  0% {
    transform: translateY(10px);
  }
  100% {
    transform: translateY(90px);
  }
`

const AnimatedDots = () => {
  const shadowColor = useColorModeValue('#f8fafc', '#1e2024')
  const dotPositions = [-75, -55, -35, -15, 5, 25, 45, 65]

  return (
    <Box
      position='relative'
      height='60px'
      width='20px'
      overflow='hidden'
      display='flex'
      flexDirection='column'
      alignItems='center'
      justifyContent='center'
      zIndex={0}
    >
      <Box
        position='absolute'
        top='-10px'
        left='0'
        right='0'
        height='30px'
        background={`linear-gradient(to bottom, ${shadowColor} 0%, ${shadowColor}80 70%, transparent 100%)`}
        zIndex={2}
        pointerEvents='none'
      />

      <Box
        position='absolute'
        bottom='-10px'
        left='0'
        right='0'
        height='30px'
        background={`linear-gradient(to top, ${shadowColor} 0%, ${shadowColor}80 70%, transparent 100%)`}
        zIndex={2}
        pointerEvents='none'
      />
      {dotPositions.map((topPosition, index) => {
        return (
          <Box
            key={index}
            position='absolute'
            width='6px'
            height='6px'
            bg='text.subtle'
            borderRadius='full'
            zIndex={1}
            left='50%'
            marginLeft='-3px'
            top={`${topPosition}px`}
            animation={`${infiniteScroll} 5s infinite linear`}
          />
        )
      })}
    </Box>
  )
}

export const Confirm = () => {
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
  const allowCustomSendNonce = getConfig().VITE_EXPERIMENTAL_CUSTOM_SEND_NONCE
  const toBg = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const {
    state: { wallet },
  } = useWallet()

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

  const feeAmountUserCurrency = useMemo(() => {
    const { fiatFee } = fees ? fees[feeType as FeeDataKey] : { fiatFee: 0 }
    return fiatFee
  }, [fees, feeType])

  const cryptoAmountFee = useMemo(() => {
    const { txFee } = fees ? fees[feeType as FeeDataKey] : { txFee: 0 }
    return txFee.toString()
  }, [fees, feeType])

  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const handleNonceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setValue(SendFormFields.CustomNonce, value)
    },
    [setValue],
  )

  const handleBack = useCallback(() => navigate(SendRoutes.Amount), [navigate])

  // We don't want this firing -- but need it for typing
  const handleAccountChange = useCallback(() => {}, [])

  const sendAssetTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.send.confirm.sendAsset', { asset: asset?.name ?? '' }],
    [asset],
  )

  const assetMemoTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.send.sendForm.assetMemo', { assetSymbol: asset?.symbol ?? '' }],
    [asset],
  )

  const confirmTransactionTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.send.confirmTransaction', { address: middleEllipsis(to ?? '') }],
    [to],
  )

  const chainName = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    const chainName = chainAdapterManager.get(asset?.chainId ?? '')?.getDisplayName()
    return chainName
  }, [asset?.chainId])

  if (!(to && asset?.name && amountCryptoPrecision && fiatAmount && feeType)) return null

  return (
    <SlideTransition className='flex flex-col h-full'>
      <DialogHeader>
        <DialogBackButton onClick={handleBack} />
        <DialogTitle textAlign='center'>
          <Text translation={sendAssetTranslation} />
        </DialogTitle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <Flex flexDirection='column' alignItems='center' mb={8}>
          <Text
            translation={confirmTransactionTranslation}
            fontSize='2xl'
            fontWeight='normal'
            textAlign='center'
            maxWidth='300px'
          />
        </Flex>
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
                translation='modals.send.sendForm.to'
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
            <Box fontSize='2xl' fontWeight='bold' pb={4}>
              <InlineCopyButton value={to}>
                {vanityAddress ? vanityAddress : <MiddleEllipsis value={to} />}
              </InlineCopyButton>
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

            {/* @TODO: Use custom receive address avatar */}
            <ProfileAvatar borderRadius='full' position='relative' zIndex={2} size='md' />
          </Flex>
        </Flex>
        <Stack spacing={4} mb={6} px={4}>
          <Row flexWrap='wrap'>
            <Row.Label>
              <Text translation={'modals.send.sendForm.chain'} />
            </Row.Label>
            <Row.Value fontSize={'md'} display='flex' alignItems='center'>
              <CText>{chainName}</CText>
              <AssetIcon assetId={asset.assetId} showNetworkIcon size='xs' ml={2} />
            </Row.Value>
          </Row>
          <Row alignItems='center'>
            <Row.Label>
              <Text translation='modals.send.sendForm.from' />
            </Row.Label>
            <Row.Value display='flex' alignItems='center'>
              <InlineCopyButton
                isDisabled={!accountId || isUtxoAccountId(accountId)}
                value={fromAccountId(accountId ?? '').account}
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
          {/* <FormControl mt={4}>
            <Row variant='vertical'>
              <Row.Label>
                <FormLabel color='text.subtle' htmlFor='tx-fee'>
                  {translate('modals.send.sendForm.transactionFee')}
                </FormLabel>
              </Row.Label>
              <TxFeeRadioGroup fees={fees} />
            </Row>
          </FormControl> */}
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
        <Flex>
          <Box>
            <Flex fontWeight='bold' color='text.primary'>
              <Amount.Crypto me={2} value={cryptoAmountFee} symbol={feeAsset?.symbol ?? ''} />
              (<Amount.Fiat value={feeAmountUserCurrency} />)
            </Flex>
            <Text color='text.subtle' translation='common.feeEstimate' />
          </Box>
          <GasSelectionMenu />
        </Flex>
        <Button
          colorScheme='blue'
          isDisabled={!fees || isSubmitting}
          isLoading={isSubmitting}
          loadingText={translate('modals.send.broadcastingTransaction')}
          size='lg'
          mt={6}
          type='submit'
          width='full'
        >
          <Text translation='common.confirm' />
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
