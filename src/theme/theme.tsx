import type { ThemeConfig } from '@chakra-ui/react'
import { extendTheme } from '@chakra-ui/react'
import type { StyleFunctionProps } from '@chakra-ui/theme-tools'
import { mode } from '@chakra-ui/theme-tools'
import { AccordionStyle as Accordion } from 'components/Accordion/Accordion.theme'
import { AlertStyle as Alert } from 'components/Alert/Alert.theme'
import { AvatarStyle as Avatar } from 'components/Avatar/Avatar.theme'
import { ButtonStyle as Button } from 'components/Button/Button.theme'
import { CardStyle as Card } from 'components/Card/Card.theme'
import { DividerStyle as Divider } from 'components/Divider/Divider.theme'
import { DrawerStyle as Drawer } from 'components/Drawer/Drawer.theme'
import { FormStyle as Form } from 'components/Form/form.theme'
import { HeadingStyle as Heading } from 'components/Heading/Heading.theme'
import { InputStyle as Input } from 'components/Input/Input.theme'
import { ListStyle as List } from 'components/List/list.theme'
import { MenuStyle as Menu } from 'components/Menu/Menu.theme'
import { ModalStyle as Modal } from 'components/Modal/Modal.theme'
import { PopoverStyle as Popover } from 'components/Popover/Popover.theme'
import { ProgressStyle as Progress } from 'components/Progres/Progress.theme'
import { RowStyle as Row } from 'components/Row/Row.theme'
import { SkeletonStyle as Skeleton } from 'components/Skeleton/Skeleton.theme'
import { SpinnerStyle as Spinner } from 'components/Spinner/Spinner.theme'
import { StackDividerStyle as StackDivider } from 'components/StackDivider/StackDivider.theme'
import { StatStyle as Stat } from 'components/Stat/Stat.theme'
import { stepperTheme as Stepper } from 'components/Stepper.theme'
import { StepsStyle as CustomSteps } from 'components/Steps.theme'
import { TableStyle as Table } from 'components/Table/Table.theme'
import { TabsStyle as Tabs } from 'components/Tabs/Tabs.theme'
import { TagStyle as Tag } from 'components/Tag/Tag.theme'
import { TextStyle as Text } from 'components/Text/text.theme'
import { TextareaStyle as Textarea } from 'components/Textarea/Textarea.theme'
import { TooltipStyle as Tooltip } from 'components/Tooltip/Tooltip.theme'

import { colors } from './colors'
import { semanticTokens } from './semanticTokens'

export const breakpoints = {
  sm: '480px',
  md: '768px',
  lg: '992px',
  xl: '1280px',
  '2xl': '1440px',
  '3xl': '2200px',
}

const styles = {
  global: (props: StyleFunctionProps) => ({
    body: {
      backgroundColor: 'background.surface.base',
      backgroundSize: 'cover',
      fontFeatureSettings: `'zero' on`,
      minHeight: '100%',
    },
    '#root': {
      background: 'background.surface.base',
    },
    html: {
      scrollBehavior: 'smooth',
      minHeight: '100vh',
    },
    h1: {
      fontSize: '4xl',
      fontWeight: 'semibold',
    },
    h2: {
      fontSize: '3xl',
      fontWeight: 'semibold',
    },
    h3: {
      fontSize: '2xl',
      fontWeight: 'semibold',
    },
    h4: {
      fontSize: 'xl',
      fontWeight: 'semibold',
    },
    h5: {
      fontSize: 'lg',
      fontWeight: 'semibold',
    },
    h6: {
      fontSize: 'md',
      fontWeight: 'semibold',
    },
    '.bottom-gradient': {
      backgroundImage: `linear-gradient(
        to top,
        hsl(210, 11%, 7%) 0%,
        hsla(210, 11%, 7%, 0.987) 7.5%,
        hsla(210, 11%, 7%, 0.951) 13.3%,
        hsla(210, 11%, 7%, 0.896) 17.9%,
        hsla(210, 11%, 7%, 0.825) 21.5%,
        hsla(210, 11%, 7%, 0.741) 24.6%,
        hsla(210, 11%, 7%, 0.648) 27.4%,
        hsla(210, 11%, 7%, 0.55) 30.4%,
        hsla(210, 11%, 7%, 0.45) 33.8%,
        hsla(210, 11%, 7%, 0.352) 38%,
        hsla(210, 11%, 7%, 0.259) 43.4%,
        hsla(210, 11%, 7%, 0.175) 50.3%,
        hsla(210, 11%, 7%, 0.104) 59.1%,
        hsla(210, 11%, 7%, 0.049) 70%,
        hsla(210, 11%, 7%, 0.013) 83.6%,
        hsla(210, 11%, 7%, 0) 100%
      );`,
    },
    '.flex': {
      display: 'flex',
    },
    '.flex-col': {
      flexDirection: 'column',
    },
    '.h-full': {
      height: '100%',
    },
    '.app-height': {
      minHeight: '100vh',
    },
    '.scroll-container': {
      visibility: 'hidden',
      paddingRight: '12px',
      transition: 'visibility .5s ease-in-out',
    },
    '.scroll-container::-webkit-scrollbar': {
      background: 'transparent',
      width: '8px',
      height: '8px',
    },
    '.scroll-container::-webkit-scrollbar-thumb': {
      border: 'none',
      boxShadow: 'none',
      background: mode('blackAlpha.50', 'whiteAlpha.300')(props),
      borderRadius: '8px',
      minHeight: '40px',
    },
    '.scroll-container::-webkit-scrollbar-thumb:hover': {
      backgroundColor: mode('blackAlpha.800', 'whiteAlpha.800')(props),
    },
    '.scroll-container > div,.scroll-container:hover,.scroll-container:focus': {
      visibility: 'visible',
    },
    '.chakra-menu__group': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    '--shapeshift-header-bg': mode('white', 'blackAlpha.100')(props),
    '#chakra-toast-manager-bottom-right': {
      '.chakra-toast': {
        '.chakra-toast__inner': {
          width: '100%',
        },
        '.chakra-alert': {
          justifyContent: 'space-between',
        },
        '.chakra-alert > div:nth-child(2)': {
          width: '100%',
          justifyContent: 'space-between',
          button: {
            minWidth: 'inherit',
          },
        },
      },
    },
  }),
}

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  breakpoints,
  styles,
  fonts: {
    body: 'Inter, system-ui, sans-serif',
    heading: 'Work Sans, system-ui, sans-serif',
  },
  colors,
  components: {
    Accordion,
    Alert,
    Avatar,
    Button,
    Menu,
    Spinner,
    Stat,
    Input,
    Tabs,
    Modal,
    Card,
    Form,
    List,
    Heading,
    Progress,
    Row,
    Drawer,
    Divider,
    Text,
    Textarea,
    Tooltip,
    Table,
    Tag,
    StackDivider,
    Skeleton,
    Steps: CustomSteps,
    Stepper,
    Popover,
  },
  sizes: {
    container: {
      '2xl': '1440px',
      '3xl': '1600px',
      '4xl': '1955px',
    },
  },
  shadows: {
    xl: '0 2px 4px 2px rgba(0,0,0,.15),0 2px 10px 2px rgba(0,0,0,.2)',
    'outline-inset': '0 0 0 3px rgba(66, 153, 225, 0.6) inset',
    right: '3px 0px 2px rgba(0,0,0,.5), 5px 0 10px rgba(0,0,0,.2)',
  },
  semanticTokens,
  config,
})
