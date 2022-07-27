import { ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Stack, Tag } from '@chakra-ui/react'
import { useMemo } from 'react'
import { ReactElement } from 'react'
import { useHistory } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { FiatRamp, SupportedFiatRampConfig, supportedFiatRamps } from '../config'
import { FiatRampsRoutes } from '../FiatRampsCommon'

type RampsListProps = {
  setFiatRampProvider: (fiatRamp: FiatRamp) => void
}

export const RampsList: React.FC<RampsListProps> = ({ setFiatRampProvider }) => {
  const history = useHistory()
  const junoPayFeatureFlag = useFeatureFlag('JunoPay')

  const ramps = useMemo(() => {
    type Entry = [keyof typeof supportedFiatRamps, SupportedFiatRampConfig]
    const initial: ReactElement[] = []
    const result = (Object.entries(supportedFiatRamps) as Entry[]).reduce(
      (acc, supportedFiatRamp) => {
        const [fiatRamp, fiatRampConfig] = supportedFiatRamp
        fiatRampConfig.isImplemented = (() => {
          // since isImplemented is set in a config file where we can't use hooks,
          // we reassign isImplemented here based on the feature flag.
          switch (fiatRamp) {
            case 'JunoPay':
              return junoPayFeatureFlag
            default:
              return true
          }
        })()
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
  }, [history, setFiatRampProvider, junoPayFeatureFlag])

  return (
    <Flex justifyContent='center' alignItems='center' width={['100%', '32rem']}>
      <Card boxShadow='none' borderWidth={0}>
        <Card.Header>
          <Card.Heading>
            <Text translation='fiatRamps.title' />
          </Card.Heading>
        </Card.Header>
        <Card.Body>
          <Text lineHeight={1.2} color='gray.500' translation='fiatRamps.titleMessage' />
          <Stack spacing={2} mt={2} mx={-4}>
            {ramps}
          </Stack>
        </Card.Body>
      </Card>
    </Flex>
  )
}
