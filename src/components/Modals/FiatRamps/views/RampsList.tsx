import { ChevronRightIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  ModalBody,
  ModalHeader,
  Stack,
  Tag,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import type { FiatRamp, SupportedFiatRampConfig } from '../config'
import { supportedFiatRamps } from '../config'
import { FiatRampsRoutes } from '../FiatRampsCommon'

type RampsListProps = {
  setFiatRampProvider: (fiatRamp: FiatRamp) => void
}

export const RampsList: React.FC<RampsListProps> = ({ setFiatRampProvider }) => {
  const history = useHistory()
  const mtPelerinFiatRampFlag = useFeatureFlag('MtPelerinFiatRamp')
  const tagColor = useColorModeValue('gray.600', 'gray.400')
  const ramps = useMemo(() => {
    type Entry = [keyof typeof supportedFiatRamps, SupportedFiatRampConfig]
    const initial: ReactElement[] = []
    const result = (Object.entries(supportedFiatRamps) as Entry[]).reduce(
      (acc, supportedFiatRamp) => {
        const [fiatRamp, fiatRampConfig] = supportedFiatRamp
        // TODO: remove before merging to develop
        if (fiatRamp === 'MtPelerin' && !mtPelerinFiatRampFlag) return acc
        if (fiatRampConfig.isImplemented) {
          acc.unshift(
            <Button
              key={fiatRamp}
              width='full'
              height='auto'
              justifyContent='space-between'
              variant='ghost'
              fontWeight='normal'
              data-test={`fiat-ramp-${fiatRamp}-button`}
              py={2}
              onClick={() => {
                setFiatRampProvider(fiatRamp)
                history.push(FiatRampsRoutes.Manager)
              }}
              rightIcon={<ChevronRightIcon boxSize={6} />}
            >
              <Flex
                flex={1}
                flexDirection={['column', 'row']}
                justifyContent='space-between'
                alignItems={['baseline', 'center']}
                gap={['1em', 0]}
                width='100%'
              >
                <Flex flexDirection='row' justifyContent='center' alignItems='center'>
                  <AssetIcon src={fiatRampConfig.logo} />
                  <Box textAlign='left' ml={2}>
                    <Text fontWeight='bold' translation={fiatRampConfig.label} />
                    <Text translation={fiatRampConfig.info ?? ''} />
                    {fiatRampConfig.tags?.map(tag => (
                      <Tag key={tag} colorScheme='gray' size='xs' mr={2} py={1} px={2} mt={1}>
                        <Text
                          color={tagColor}
                          fontSize='12px'
                          translation={tag}
                          style={{ textTransform: 'uppercase' }}
                        />
                      </Tag>
                    ))}
                  </Box>
                </Flex>
                <Box display={['none', 'block']}>
                  {fiatRampConfig.supportsBuy ? (
                    <Tag colorScheme='green' mr={2}>
                      <Text translation='fiatRamps.buy' style={{ textTransform: 'uppercase' }} />
                    </Tag>
                  ) : null}
                  {fiatRampConfig.supportsSell ? (
                    <Tag colorScheme='gray'>
                      <Text translation='fiatRamps.sell' style={{ textTransform: 'uppercase' }} />
                    </Tag>
                  ) : null}
                </Box>
              </Flex>
            </Button>,
          )
        } else {
          acc.push(
            <Button
              key={fiatRampConfig.label}
              width='full'
              height='auto'
              justifyContent='flex-start'
              variant='ghost'
              fontWeight='normal'
              data-test={`fiat-ramp-${fiatRamp}-button`}
              py={2}
            >
              <Flex
                flexDirection='row'
                justifyContent='flex-start'
                alignItems='center'
                width='100%'
              >
                <AssetIcon src={fiatRampConfig.logo} />
                <Box textAlign='left' ml={2}>
                  <Text fontWeight='bold' translation={fiatRampConfig.label} />
                  <Text translation='fiatRamps.comingSoon' />
                </Box>
              </Flex>
            </Button>,
          )
        }
        return acc
      },
      initial,
    )
    return result
  }, [history, mtPelerinFiatRampFlag, setFiatRampProvider, tagColor])

  return (
    <>
      <ModalHeader>
        <Text translation='fiatRamps.title' />
        <Text
          fontSize='md'
          fontWeight='medium'
          color='gray.500'
          translation='fiatRamps.titleMessage'
        />
      </ModalHeader>
      <ModalBody>
        <Stack spacing={2} mt={2} mx={-4}>
          {ramps}
        </Stack>
      </ModalBody>
    </>
  )
}
