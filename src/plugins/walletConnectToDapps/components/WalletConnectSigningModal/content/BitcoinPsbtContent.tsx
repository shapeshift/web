import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Card, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import { btcChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { fromBaseUnit } from '@/lib/math'
import { parsePsbt } from '@/plugins/walletConnectToDapps/utils/parsePsbt'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BitcoinPsbtContentProps = {
  psbt: string
  broadcast?: boolean
}

export const BitcoinPsbtContent: FC<BitcoinPsbtContentProps> = ({ psbt, broadcast }) => {
  const translate = useTranslate()
  const sectionBorderColor = useColorModeValue('gray.100', 'whiteAlpha.100')
  const [isDetailExpanded, toggleIsDetailExpanded] = useToggle(false)

  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, btcChainId))
  const networkIcon = useMemo(
    () => feeAsset?.networkIcon ?? feeAsset?.icon,
    [feeAsset?.networkIcon, feeAsset?.icon],
  )
  const precision = feeAsset?.precision ?? 8
  const symbol = feeAsset?.symbol ?? 'BTC'

  const parsed = useMemo(() => parsePsbt(psbt), [psbt])

  const transactionDataJson = useMemo(() => {
    if (!parsed) return null
    return JSON.stringify(
      {
        version: parsed.version,
        locktime: parsed.locktime,
        inputs: parsed.inputs.map(input => ({
          txid: input.txid,
          vout: input.vout,
          address: input.address,
          value: input.value,
        })),
        outputs: parsed.outputs.map(output => ({
          address: output.address,
          value: output.value,
        })),
      },
      null,
      2,
    )
  }, [parsed])

  const hoverStyle = useMemo(() => ({ bg: 'transparent' }), [])

  if (!parsed) {
    const truncated = psbt.length > 200 ? `${psbt.substring(0, 200)}...` : psbt
    return (
      <Card borderRadius='2xl' p={4}>
        <RawText
          fontWeight='medium'
          color='text.subtle'
          wordBreak='break-all'
          fontSize='sm'
          fontFamily='mono'
        >
          {truncated}
        </RawText>
      </Card>
    )
  }

  return (
    <Card borderRadius='2xl' p={4}>
      <VStack spacing={3} align='stretch'>
        {feeAsset && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('common.network')}
            </RawText>
            <HStack spacing={2}>
              <RawText fontSize='sm' fontWeight='bold'>
                {feeAsset.networkName || feeAsset.name}
              </RawText>
              {networkIcon && <Image boxSize='20px' src={networkIcon} alt='' borderRadius='full' />}
            </HStack>
          </HStack>
        )}

        <RawText fontSize='sm' color='text.subtle' pt={1}>
          {translate('plugins.walletConnectToDapps.modal.sendTransaction.inputs', {
            count: parsed.inputs.length,
          })}
        </RawText>
        {parsed.inputs.map((input, i) => (
          <HStack key={i} justify='space-between' align='center' py={1} pl={2}>
            {input.address ? (
              <InlineCopyButton value={input.address}>
                <MiddleEllipsis value={input.address} fontSize='xs' py={0} />
              </InlineCopyButton>
            ) : (
              <RawText fontSize='xs' color='text.subtle' fontFamily='mono'>
                {`${input.txid.substring(0, 8)}...:${input.vout}`}
              </RawText>
            )}
            <Amount.Crypto
              value={fromBaseUnit(input.value, precision)}
              symbol={symbol}
              fontSize='xs'
              fontWeight='bold'
              whiteSpace='nowrap'
            />
          </HStack>
        ))}

        <RawText fontSize='sm' color='text.subtle' pt={1}>
          {translate('plugins.walletConnectToDapps.modal.sendTransaction.outputs', {
            count: parsed.outputs.length,
          })}
        </RawText>
        {parsed.outputs.map((output, i) => (
          <HStack key={i} justify='space-between' align='center' py={1} pl={2}>
            {output.address ? (
              <InlineCopyButton value={output.address}>
                <MiddleEllipsis value={output.address} fontSize='xs' py={0} />
              </InlineCopyButton>
            ) : (
              <RawText fontSize='xs' color='text.subtle' fontFamily='mono'>
                OP_RETURN
              </RawText>
            )}
            <Amount.Crypto
              value={fromBaseUnit(output.value, precision)}
              symbol={symbol}
              fontSize='xs'
              fontWeight='bold'
              whiteSpace='nowrap'
            />
          </HStack>
        ))}

        {broadcast !== undefined && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('plugins.walletConnectToDapps.modal.sendTransaction.broadcast')}
            </RawText>
            <RawText fontSize='sm' fontWeight='bold'>
              {translate(broadcast ? 'common.yes' : 'common.no')}
            </RawText>
          </HStack>
        )}

        <Box borderTop='1px solid' borderColor={sectionBorderColor} pt={4} mt={2}>
          <Button
            variant='ghost'
            size='sm'
            p={0}
            h='auto'
            fontWeight='medium'
            justifyContent='space-between'
            onClick={toggleIsDetailExpanded}
            _hover={hoverStyle}
            w='full'
            mb={isDetailExpanded ? 3 : 0}
          >
            <RawText fontSize='sm' fontWeight='medium' color='text.subtle'>
              {translate('plugins.walletConnectToDapps.modal.transactionData')}
            </RawText>
            {isDetailExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
          {isDetailExpanded && transactionDataJson && (
            <RawText
              fontSize='xs'
              fontFamily='mono'
              color='text.subtle'
              wordBreak='break-all'
              whiteSpace='pre-wrap'
            >
              {transactionDataJson}
            </RawText>
          )}
        </Box>
      </VStack>
    </Card>
  )
}
