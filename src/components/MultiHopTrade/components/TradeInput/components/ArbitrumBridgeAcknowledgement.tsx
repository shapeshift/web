import { Box, Checkbox, Link } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AcknowledgementProps } from 'components/Acknowledgement/Acknowledgement'
import { Acknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { RawText } from 'components/Text/Text'

type ArbitrumAcknowledgementProps = Omit<AcknowledgementProps, 'message'>

export const ArbitrumBridgeAcknowledgement = (props: ArbitrumAcknowledgementProps) => {
  const translate = useTranslate()
  const [hasAgreed, setHasAgreed] = useState([false, false])

  const isDisabled = useMemo(() => !hasAgreed.every(Boolean), [hasAgreed])

  const handleAgree = useCallback(
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const updatedAgreements = [...hasAgreed]
      updatedAgreements[index] = event.target.checked
      setHasAgreed(updatedAgreements)
    },
    [hasAgreed],
  )

  const checkboxTextColor = useColorModeValue('gray.800', 'gray.50')

  const checkboxes = useMemo(
    () => (
      <Box py={4} textAlign='left' color={checkboxTextColor}>
        <Checkbox onChange={handleAgree(0)} fontWeight='bold' py={2}>
          {translate('bridge.arbitrum.waitCta')}
        </Checkbox>
        <Checkbox onChange={handleAgree(1)} fontWeight='bold' py={2}>
          {translate('bridge.arbitrum.claimCta')}
        </Checkbox>
      </Box>
    ),
    [checkboxTextColor, handleAgree, translate],
  )

  const handleAcknowledge = useMemo(() => {
    if (isDisabled) return

    return props.onAcknowledge
  }, [isDisabled, props])

  const message = useMemo(
    () => (
      <>
        <RawText as='span'>{translate('bridge.arbitrum.waitWarning')}</RawText>{' '}
        <Link
          href='https://docs.arbitrum.io/arbitrum-bridge/quickstart#withdraw-eth-or-erc-20-tokens-from-child-chain-to-parent-chain'
          isExternal
          colorScheme='blue'
          color='blue.500'
        >
          {translate('common.learnMore')}
        </Link>
      </>
    ),
    [translate],
  )

  return (
    <Acknowledgement
      {...props}
      buttonTranslation='common.continue'
      message={message}
      content={checkboxes}
      disableButton={isDisabled}
      onAcknowledge={handleAcknowledge}
    />
  )
}
