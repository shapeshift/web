import { Rail } from 'components/Layout/Rail'

export const width = 360

export const RightSidebar: React.FC = ({ children }) => {
  return <Rail minWidth={{ base: 'auto', lg: `${width}px` }}>{children}</Rail>
}
