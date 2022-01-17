// This is a Jest-friendly stub for use while testing.
//
// We can't use `fetch()` to load `env.json` when running tests because Jest doesn't do top-level await.
// We can't manually mock out the fetch because we'd either have to turn on automock, which mocks *everything*
// and breaks a lot of stuff, or call `jest.mock()`, which doesn't exist in the browser. It can't be called
// conditionally because that breaks Jest's magic hoisting BS, and we can't polyfill it because the existence
// of a global `jest` object causes various things to think they're being tested and complain that their
// "test harnesses" aren't set up correctly.
//
// Instead, we leave this jest-friendly behavior as the default, and swap in the behavior we want to happen
// in the browser during the build of the webpack bundle.

// eslint-disable-next-line import/no-default-export
export default Object.fromEntries(
  Object.entries(process.env).filter(([k]) => k.startsWith('REACT_APP_'))
)
