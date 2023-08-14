import { Box, Card, Divider, useColorModeValue } from '@chakra-ui/react'
import startCase from 'lodash/startCase'
import { ModalCollapsableSection } from 'plugins/walletConnectToDapps/components/modals/ModalCollapsableSection'
import { Fragment, useMemo } from 'react'
import { FaCode } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'

/**
 * yes, this is recursive jsx
 */
const PresentKeyValues = ({ object }: { object: any }) => {
  const entries = useMemo(() => {
    return Object.entries(object).map(([key, value], index, arr) => {
      return (
        <Fragment key={index}>
          <>
            <RawText color='text.subtle' fontWeight='medium' fontSize='sm'>
              {startCase(key)}
            </RawText>
            {typeof value === 'object' ? (
              <Box pt={4} pl={4}>
                <PresentKeyValues object={value} />
              </Box>
            ) : (
              <RawText fontFamily='monospace'>{value as string}</RawText>
            )}
          </>
          {index !== arr.length - 1 && <Divider my={4} />}
        </Fragment>
      )
    })
  }, [object])
  return <Box>{entries}</Box>
}
export const TypedMessageInfo = ({ typedData }: { typedData: string }) => {
  const cardBg = useColorModeValue('white', 'gray.850')
  const translate = useTranslate()

  const parsedMessage = JSON.parse(typedData)
  return (
    <>
      <Card bg={cardBg} borderRadius='md' px={4} py={2}>
        <ModalCollapsableSection
          title={
            <Box lineHeight={2.4} m={0}>
              {translate('plugins.walletConnectToDapps.modal.signMessage.messageData')}
            </Box>
          }
          icon={<FaCode />}
        >
          <PresentKeyValues object={parsedMessage.message} />
        </ModalCollapsableSection>
      </Card>
      {parsedMessage.domain && (
        <Card bg={cardBg} borderRadius='md' px={4} py={2}>
          <ModalCollapsableSection
            defaultOpen={false}
            title={
              <Box lineHeight={2.4} m={0}>
                {translate('plugins.walletConnectToDapps.modal.signMessage.domain')}
              </Box>
            }
            icon={<FaCode />}
          >
            <PresentKeyValues object={parsedMessage.domain} />
          </ModalCollapsableSection>
        </Card>
      )}
    </>
  )
}
