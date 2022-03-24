import { ChatIcon, SettingsIcon } from '@chakra-ui/icons'
import { Box, Flex, FlexProps, Link, Stack, useMediaQuery } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route } from 'Routes/helpers'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { ReduxState } from 'state/reducer'
import { selectFeatureFlag } from 'state/slices/selectors'
import { breakpoints } from 'theme/theme'

import { AutoCompleteSearch } from './AutoCompleteSearch/AutoCompleteSearch'
import { FiatRamps } from './NavBar/FiatRamps'
import { MainNavLink } from './NavBar/MainNavLink'
import { NavBar } from './NavBar/NavBar'
import { UserMenu } from './NavBar/UserMenu'

type HeaderContentProps = {
  route?: Route
  isCompact?: boolean
} & FlexProps

export const SideNavContent = ({ isCompact }: HeaderContentProps) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const gemRampFlag = useSelector((state: ReduxState) => selectFeatureFlag(state, 'GemRamp'))
  const { settings } = useModal()

  return (
    <Flex
      width='full'
      height='full'
      alignItems='flex-start'
      justifyContent='flex-start'
      data-test='full-width-header'
      flexDir='column'
      p={4}
    >
      {!isLargerThanMd && (
        <>
          <Flex width='full'>
            <UserMenu />
          </Flex>
          {gemRampFlag && (
            <Flex width='full' mt={4}>
              <FiatRamps />
            </Flex>
          )}
          <Box mt={12} width='full'>
            <AutoCompleteSearch />
          </Box>
        </>
      )}

      <NavBar isCompact={isCompact} mt={6} />
      <Stack width='full'>
        <MainNavLink
          variant='ghost'
          isCompact={isCompact}
          onClick={() => settings.open({})}
          label={translate('common.settings')}
          leftIcon={<SettingsIcon />}
        />
        <MainNavLink
          leftIcon={<ChatIcon />}
          isCompact={isCompact}
          as={Link}
          justifyContent='flex-start'
          variant='ghost'
          label={translate('common.submitFeedback')}
          isExternal
          href='https://shapeshift.notion.site/Submit-Feedback-or-a-Feature-Request-af48a25fea574da4a05a980c347c055b'
        />
      </Stack>
    </Flex>
  )
}
