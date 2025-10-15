# Sentry Error Tracking Strategy

This document outlines how we use Sentry for error tracking and monitoring in the ShapeShift web application.

## Philosophy

Our Sentry configuration is designed to capture **actionable bugs** while filtering out **noise** from:
- Expected business logic errors (e.g., trade quote failures)
- User-initiated actions (e.g., transaction rejections)
- Network connectivity issues
- External service errors we can't control

## What Gets Captured

### ✅ Errors We Capture

- **5xx Server Errors**: Backend issues that indicate problems with our services
- **Unexpected Application Errors**: JavaScript errors, React errors, unhandled exceptions
- **Critical Bugs**: Any error that indicates a bug in our code

### ❌ Errors We Filter Out

- **Status 0 Errors**: Cancelled requests, offline network, CORS issues
- **4xx Client Errors**: Bad requests, not found, unauthorized (user errors, not bugs)
- **Business Logic Errors**: Trade quote errors, unsupported pairs, rate limits
- **User Cancellations**: Transaction rejections, user-denied prompts
- **Browser Extension Errors**: Errors from third-party extensions
- **Network Errors**: Failed fetches, timeouts, connection issues
- **Expected WebSocket Errors**: Reconnection failures, timeouts

## Configuration

### HTTP Client Integration

Only captures 5xx server errors:
```typescript
httpClientIntegration({
  failedRequestStatusCodes: [[500, 599]],
  denyUrls: [
    'alchemy.com',
    'snapshot.org',
    'coingecko.com',
    // External APIs we don't control
  ],
})
```

### Ignored Errors

Configured at the SDK level to never send these errors:
- Network errors (NetworkError, Failed to fetch, etc.)
- Browser extension errors
- ResizeObserver loops
- User rejections/denials
- Business logic errors (UnsupportedTradePair, NoRouteFound, etc.)

### beforeSend Hook

Additional runtime filtering:
- Filters browser extension URLs
- Filters trade errors that slip through
- Enriches Axios errors with request/response context
- Adds error classification tags
- Groups errors by URL for better organization

### beforeBreadcrumb Hook

Reduces breadcrumb noise:
- Only keeps console errors (not logs/info)
- Only keeps failed HTTP requests (not successful ones)
- Filters out UI events (clicks, inputs)

## Using Sentry in Code

### Error Boundaries

All error boundaries use `captureExceptionWithContext` for consistent error handling.

**Component-level error boundaries** use `level: 'error'`:
```typescript
import { captureExceptionWithContext } from '@/utils/sentry/helpers'

const handleError = (error: Error, info: { componentStack: string }) => {
  captureExceptionWithContext(error, {
    tags: {
      errorBoundary: 'MyComponentBoundary',
    },
    extra: {
      componentStack: info.componentStack,
    },
    level: 'error',
  })
}
```

**App-level crashes** (top-level error boundary in `AppProviders`) use `level: 'fatal'`:
```typescript
captureExceptionWithContext(error, {
  tags: {
    errorBoundary: 'AppProviders',
    critical: 'true',
  },
  extra: {
    componentStack: info.componentStack,
  },
  level: 'fatal', // Critical - entire app crashed
})
```

### Manual Error Capture

Use the helper functions for manual error capture:

```typescript
import { captureExceptionWithContext, shouldCaptureError } from '@/utils/sentry/helpers'

try {
  // some code
} catch (error) {
  // Only capture if it's not an expected error
  if (shouldCaptureError(error)) {
    captureExceptionWithContext(error, {
      tags: { feature: 'trading' },
      extra: { tradeInput },
      level: 'warning',
    })
  }
}
```

### Helper Functions

#### `isExpectedError(error: unknown): boolean`

Checks if an error is a business logic or user-facing error that shouldn't be sent to Sentry.

#### `shouldCaptureError(error: unknown): boolean`

Determines whether an error should be captured. Returns `false` for expected errors and network errors.

#### `captureExceptionWithContext(error: unknown, context?): void`

Captures an exception with additional context. Automatically filters out errors that shouldn't be captured.

## Release Tracking

Errors are tagged with the release version:
```typescript
release: `shapeshift-web@${import.meta.env.VITE_VERSION ?? 'unknown'}`
```

This allows us to:
- Track when bugs were introduced
- Correlate errors with specific deployments
- See if errors decrease after a fix is deployed

## Environment-Specific Behavior

- **Localhost**: Sentry is disabled
- **Development/Staging**: All filtering rules apply
- **Production**: All filtering rules apply

## Testing Sentry Locally

To test Sentry configuration locally without modifying code:

1. Add `VITE_ENABLE_SENTRY_LOCALHOST=true` to your `.env.local` file
2. Restart your dev server
3. Test various error scenarios
4. Check Sentry dashboard to verify correct filtering
5. Remove the env var when done (or just restart without it)

## Monitoring Best Practices

### Regular Review

- Review Sentry weekly for new error patterns
- Adjust filters if new noise patterns emerge
- Update `ignoreErrors` as needed

### Error Grouping

Errors are grouped by:
- Error message and stack trace (Sentry default)
- URL for HTTP errors (custom fingerprinting)
- Error type (via tags)

### Alert Configuration

Set up alerts for:
- **Fatal errors** (app crashes with `level: 'fatal'`) - Immediate notification
- **New issues** (first-time errors) - Daily digest
- **High-frequency errors** (spikes in error rate) - Threshold-based alerts
- **Critical tag** (errors marked with `critical: 'true'`) - Immediate notification

## Common Patterns

### Trade-Related Errors

Trade errors are expected business logic and are filtered out:
- `UnsupportedTradePair`
- `NoRouteFound`
- `RateLimitExceeded`
- `SellAmountBelowMinimum`

These are shown to users via toast notifications and don't need Sentry tracking.

### Network Errors

Network connectivity issues are filtered:
- `Failed to fetch`
- `NetworkError`
- Timeout errors
- Status 0 errors

These often indicate user network issues, not bugs.

### Wallet Errors

User rejections are filtered:
- Transaction rejections
- User denied prompts
- Wallet connection failures

## Debugging Tips

### Finding Real Bugs

Look for errors with:
- High frequency in short time
- Multiple users affected
- Specific to a release
- Clear stack traces in our code

### Ignoring Noise

Skip errors that:
- Come from browser extensions
- Have status 0
- Are expected business logic
- Come from external APIs we don't control

## Maintenance

### When to Update Filters

Add new filters when you notice:
- Repeated errors that aren't actionable
- External service errors
- New expected business logic errors
- Browser API deprecations

### Version Management

Update `VITE_VERSION` in:
- CI/CD pipeline
- Build scripts
- Environment configuration

## Questions or Issues?

If you're unsure whether an error should be captured:
1. Check if it's actionable (can we fix it?)
2. Check if it indicates a bug in our code
3. Check if users are negatively impacted
4. If yes to all three, it should be captured

When in doubt, err on the side of capturing initially, then add filters after reviewing in Sentry.
