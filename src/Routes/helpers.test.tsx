import { generateAppRoutes, pathTo } from './helpers'

const TestComp = () => <div />

describe('generateAppRoutes', () => {
  it('handles routes without children', () => {
    const routes = [
      {
        path: '/',
        label: 'Home',
        main: <TestComp />
      }
    ]
    const flattenedRoutes = generateAppRoutes(routes)
    expect(flattenedRoutes[0]).toEqual({ ...routes[0] })
    expect(flattenedRoutes.length).toEqual(1)
  })
  it('handles routes with children', () => {
    const routes = [
      {
        path: '/',
        label: 'Home',
        main: <TestComp />,
        routes: [
          {
            path: '/child',
            label: 'Child Route',
            main: <TestComp />
          },
          {
            path: '/child',
            label: 'Child Route',
            main: <TestComp />
          }
        ]
      }
    ]
    const flattenedRoutes = generateAppRoutes(routes)
    expect(flattenedRoutes.length).toEqual(3)
  })
  it('handles the path to the parent', () => {
    const routes = [
      {
        path: '/',
        label: 'Home',
        main: <TestComp />,
        routes: [
          {
            path: '/child1',
            label: 'Child Route',
            main: <TestComp />
          },
          {
            path: '/child2',
            label: 'Child Route',
            main: <TestComp />
          }
        ]
      }
    ]
    const flattenedRoutes = generateAppRoutes(routes)
    const parent = flattenedRoutes.find(route => route.path === '/')
    const child = flattenedRoutes.find(route => route.path === '/child2')
    const result = pathTo(child!)
    expect(result[0].path).toEqual(parent!.path)
  })
})
