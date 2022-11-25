import { Box, Divider, useColorModeValue } from '@chakra-ui/react'
import startCase from 'lodash/startCase'
import { Fragment } from 'react'
import { FaCode } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'

import { ModalCollapsableSection } from './ModalCollapsableSection'

const PresenstKeyValues = ({ object }: { object: any }) => {
  return (
    <Box>
      {Object.entries(object).map(([key, value], index, arr) => {
        return (
          <Fragment key={index}>
            <>
              <RawText color='gray.500' fontWeight='medium' fontSize='sm'>
                {startCase(key)}
              </RawText>
              {typeof value === 'object' ? (
                <Box pt={4} pl={4}>
                  <PresenstKeyValues object={value} />
                </Box>
              ) : (
                <RawText fontFamily='monospace'>{value as string}</RawText>
              )}
            </>
            {index !== arr.length - 1 && <Divider my={4} />}
          </Fragment>
        )
      })}
    </Box>
  )
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
          <PresenstKeyValues object={parsedMessage.message} />
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
            <PresenstKeyValues object={parsedMessage.domain} />
          </ModalCollapsableSection>
        </Card>
      )}
    </>
  )
}
