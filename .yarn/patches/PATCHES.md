# `friendly-challenge+0.9.2.patch`
This patches security vulnerability in the friendly challenge library.
Specifically it uses a safe library to update the DOM instead of `innerHTML`.

# `react-dom+18.2.0.patch`
This patch fixes an issue in development with `StrictMode` that logs an error:

```
Error: findDOMNode is deprecated in StrictMode
```

This is caused by [`@visx/tooltip`](https://github.com/airbnb/visx/issues/737) which uses the deprecated method.

This needs to be patched because the error method causes an `Invalid hooks call` crash
when the app is viewed inside the mobile app.
