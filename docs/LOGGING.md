# Logging System

## Overview

FAU Backend uses **Winston** for structured logging with support for multiple transports.

### Current Configuration

- **Development**: Pretty console logs with colors and timestamps
- **Production**: JSON-formatted logs optimized for log aggregation platforms

### What Gets Logged

1. **HTTP Requests/Responses** (via `LoggingInterceptor`)
   - Request method, URL, user ID
   - Response status and duration
   - Error details with stack traces

2. **Exceptions** (via `GlobalExceptionFilter`)
   - Client errors (4xx) logged as warnings
   - Server errors (5xx) logged as errors
   - Unhandled exceptions with full context

3. **Application Events**
   - Any service can inject Winston logger for custom logging

### Log Levels

Control via `LOG_LEVEL` environment variable:

- `error` - Critical errors only
- `warn` - Warnings and errors
- `info` - Include informational messages (default)
- `debug` - Verbose debugging output

## Using the Logger

### In Services/Controllers

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  async doSomething() {
    this.logger.log('Starting operation');

    try {
      // ... logic
      this.logger.log({
        message: 'Operation completed',
        itemsProcessed: 42,
      });
    } catch (error) {
      this.logger.error({
        message: 'Operation failed',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

### Structured Logging

Always prefer structured logs (objects) over plain strings:

```typescript
// ✅ Good - structured
this.logger.log({
  message: 'User registered',
  userId: user.id,
  email: user.email,
  organizationId: org.id,
});

// ❌ Avoid - plain string
this.logger.log(`User ${user.email} registered`);
```

## Migration to Datadog

### Step 1: Install Datadog Winston Transport

```bash
npm install @datadog/datadog-winston
```

### Step 2: Configure Environment Variables

```bash
DD_API_KEY=your_datadog_api_key
DD_SERVICE=fau-backend
DD_ENV=production
NODE_ENV=production
```

### Step 3: Update LoggingModule

In `src/common/logging/logging.module.ts`, uncomment and configure:

```typescript
import { DatadogWinston } from '@datadog/datadog-winston';

// In transports array:
new DatadogWinston({
  apiKey: process.env.DD_API_KEY!,
  service: process.env.DD_SERVICE || 'fau-backend',
  ddsource: 'nodejs',
  ddtags: `env:${process.env.DD_ENV || 'production'}`,
  hostname: process.env.DD_HOSTNAME,
}),
```

### Step 4: Datadog Dashboard Setup

1. Log into Datadog
2. Navigate to **Logs** → **Configuration**
3. Set up **Log Pipeline** for `fau-backend`
4. Create **Log Facets** for:
   - `userId`
   - `method`
   - `statusCode`
   - `duration`
   - `organizationId`

### Step 5: Alerting

Configure alerts in Datadog for:

- Error rate threshold (e.g., >10 errors/min)
- Response time P95 > 2000ms
- 5xx errors on critical endpoints

## Alternative Platforms

The same Winston configuration works with:

- **New Relic**: `@newrelic/winston-enricher`
- **Loggly**: `winston-loggly-bulk`
- **Elasticsearch**: `winston-elasticsearch`
- **CloudWatch**: `winston-cloudwatch`

Install the respective transport package and add to `transports` array in `LoggingModule`.

## Best Practices

1. **Always include context**: userId, organizationId, requestId
2. **Use appropriate levels**: error > warn > info > debug
3. **Avoid logging sensitive data**: passwords, tokens, credit cards
4. **Keep messages concise**: use metadata for details
5. **Log business events**: user actions, state changes, integrations

## Performance

Winston with JSON console transport adds ~1-2ms per request. For high-traffic routes, consider:

- Sampling (log 1 in N requests)
- Async transports
- Log level filtering
