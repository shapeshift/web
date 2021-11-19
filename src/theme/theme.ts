import { extendTheme } from '@chakra-ui/react'
import { mode } from '@chakra-ui/theme-tools'
import { createBreakpoints } from '@chakra-ui/theme-tools'
import { StepsStyleConfig as Steps } from 'chakra-ui-steps'
import { ButtonStyle as Button } from 'components/Button/Button.theme'
import { CardStyle as Card } from 'components/Card/Card.theme'
import { DrawerStyle as Drawer } from 'components/Drawer/Drawer.theme'
import { FormStyle as Form } from 'components/Form/form.theme'
import { HeadingStyle as Heading } from 'components/Heading/Heading.theme'
import { InputStyle as Input } from 'components/Input/Input.theme'
import { MenuStyle as Menu } from 'components/Menu/Menu.theme'
import { ModalStyle as Modal } from 'components/Modal/Modal.theme'
import { PopoverStyle as Popover } from 'components/Popover/Popover.theme'
import { ProgressStyle as Progress } from 'components/Progres/Progress.theme'
import { RowStyle as Row } from 'components/Row/Row.theme'
import { SkeletonStyle as Skeleton } from 'components/Skeleton/Skeleton.theme'
import { SpinnerStyle as Spinner } from 'components/Spinner/Spinner.theme'
import { StatStyle as Stat } from 'components/Stat/Stat.theme'
import { TabsStyle as Tabs } from 'components/Tabs/Tabs.theme'
import { TextareaStyle as Textarea } from 'components/Textarea/Textarea.theme'

import { colors } from './colors'

export const breakpoints = createBreakpoints({
  sm: '480px',
  md: '768px',
  lg: '992px',
  xl: '1280px',
  '2xl': '1920px'
})

const styles = {
  global: (props: Record<string, any>) => ({
    body: {
      backgroundColor: mode('gray.50', 'gray.800')(props),
      backgroundSize: 'cover'
    },
    html: {
      scrollBehavior: 'smooth',
      height: '100%'
    },
    h1: {
      fontSize: '4xl'
    },
    h2: {
      fontSize: '3xl'
    },
    h3: {
      fontSize: '2xl'
    },
    h4: {
      fontSize: 'xl'
    },
    h5: {
      fontSize: 'lg'
    },
    h6: {
      fontSize: 'sm'
    },
    '.scroll-container': {
      visibility: 'hidden',
      paddingRight: '12px',
      transition: 'visibility .5s ease-in-out'
    },
    '.scroll-container::-webkit-scrollbar': {
      background: 'transparent',
      width: '8px',
      height: '8px'
    },
    '.scroll-container::-webkit-scrollbar-thumb': {
      border: 'none',
      boxShadow: 'none',
      background: mode('blackAlpha.50', 'whiteAlpha.300')(props),
      borderRadius: '8px',
      minHeight: '40px'
    },
    '.scroll-container::-webkit-scrollbar-thumb:hover': {
      backgroundColor: mode('blackAlpha.800', 'whiteAlpha.800')(props)
    },
    '.scroll-container > div,.scroll-container:hover,.scroll-container:focus': {
      visibility: 'visible'
    }
  })
}

export const theme = extendTheme({
  breakpoints,
  styles,
  fonts: {
    body: 'Inter, system-ui, sans-serif',
    heading: 'Work Sans, system-ui, sans-serif'
  },
  colors,
  components: {
    Button,
    Menu,
    Spinner,
    Stat,
    Input,
    Tabs,
    Modal,
    Card,
    Form,
    Heading,
    Progress,
    Row,
    Drawer,
    Textarea,
    Skeleton,
    Steps,
    Popover
  },
  shadows: {
    xl: '0 2px 4px 2px rgba(0,0,0,.15),0 2px 10px 2px rgba(0,0,0,.2)',
    'outline-inset': '0 0 0 3px rgba(66, 153, 225, 0.6) inset',
    right: '3px 0px 2px rgba(0,0,0,.5), 5px 0 10px rgba(0,0,0,.2)'
  },
  config: {
    initialColorMode: 'dark'
  }
})
