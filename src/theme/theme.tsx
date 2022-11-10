import { type ThemeConfig, extendTheme } from '@chakra-ui/react'
import type { StyleFunctionProps } from '@chakra-ui/theme-tools'
import { mode } from '@chakra-ui/theme-tools'
import { AlertStyle as Alert } from 'components/Alert/Alert.theme'
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
import { StepsStyle as CustomSteps } from 'components/Steps.theme'
import { TableStyle as Table } from 'components/Table/Table.theme'
import { TabsStyle as Tabs } from 'components/Tabs/Tabs.theme'
import { TagStyle as Tag } from 'components/Tag/Tag.theme'
import { TextareaStyle as Textarea } from 'components/Textarea/Textarea.theme'
import { TooltipStyle as Tooltip } from 'components/Tooltip/Tooltip.theme'

import { colors } from './colors'

export const breakpoints = {
  sm: '480px',
  md: '768px',
  lg: '992px',
  xl: '1280px',
  '2xl': '1440px',
}

const styles = {
  global: (props: StyleFunctionProps) => ({
    body: {
      backgroundColor: mode('gray.50', 'gray.800')(props),
      backgroundSize: 'cover',
      fontFeatureSettings: "'zero'",
    },
    html: {
      scrollBehavior: 'smooth',
      height: '100%',
    },
    h1: {
      fontSize: '4xl',
    },
    h2: {
      fontSize: '3xl',
    },
    h3: {
      fontSize: '2xl',
    },
    h4: {
      fontSize: 'xl',
    },
    h5: {
      fontSize: 'lg',
    },
    h6: {
      fontSize: 'sm',
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
    '.chakra-switch__track': {
      _checked: {
        background: 'var(--chakra-colors-blue-400) !important',
      },
    },
    span: {
      '.chakra-switch__thumb': {
        _checked: {
          background: 'var(--chakra-colors-blue-600) !important',
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
    Alert,
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
    Textarea,
    Tooltip,
    Table,
    Tag,
    StackDivider,
    Skeleton,
    Steps: CustomSteps,
    Popover,
  },
  sizes: {
    container: {
      '2xl': '1440px',
      '3xl': '1600px',
    },
  },
  shadows: {
    xl: '0 2px 4px 2px rgba(0,0,0,.15),0 2px 10px 2px rgba(0,0,0,.2)',
    'outline-inset': '0 0 0 3px rgba(66, 153, 225, 0.6) inset',
    right: '3px 0px 2px rgba(0,0,0,.5), 5px 0 10px rgba(0,0,0,.2)',
  },
  config,
})
