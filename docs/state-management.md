## State Management

#### Tools

- [Redux](https://redux.js.org/api/api-reference), [Redux Toolkit](https://redux-toolkit.js.org/introduction/getting-started)
- React Hooks ([useState](https://reactjs.org/docs/hooks-reference.html#usestate), [useReducer](https://reactjs.org/docs/hooks-reference.html#usereducer))

#### Best Practices

- On dynamic pages the url is the source of truth use the [router](https://reactrouter.com/web/guides/quick-start) when needed.
- We prefer to use local state initially for component level state management.
- We want to [lift state](https://reactjs.org/docs/lifting-state-up.html) up the component tree as needed.
  - Use local context to avoid prop drilling. Put context as high in the component tree as needed.
  - Try not to default to always adding state to the redux store. Use redux only when sharing state across multiple places in the app. You can read more about the differences between context vs redux [here](https://blog.isquaredsoftware.com/2021/01/context-redux-differences/#tldr).
    - We use [`createSlice`](https://redux-toolkit.js.org/api/createSlice) from Redux Toolkit to create the actions and reducers.
    - We use [`createAsyncThunk`](https://redux-toolkit.js.org/api/createAsyncThunk) for async calls.
    - Everything in redux should be serializable. If there is anything that is stored inside of redux that CANNOT be serialized, it should not live inside of redux (ie, BigNumber).
  - We use [React Hook Form](https://react-hook-form.com/api) for form state management.

Note: If you have questions about any of these practices, please reach out to the core developement team.
