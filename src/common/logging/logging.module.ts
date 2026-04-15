import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Logging module using Winston.
 *
 * Current configuration:
 * - Development: Pretty console logs with colors
 * - Production: JSON logs ready for Datadog ingestion
 *
 * Migration to Datadog:
 * 1. Install: npm install @datadog/datadog-winston
 * 2. Add DatadogTransport to transports array
 * 3. Configure DD_API_KEY and DD_SERVICE env vars
 *
 * See: https://github.com/DataDog/datadog-winston
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.metadata(),
        isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ level, message, timestamp, stack, metadata }) => {
                  const meta =
                    metadata && typeof metadata === 'object' ? metadata : {};
                  const metaStr = Object.keys(meta).length
                    ? ` ${JSON.stringify(meta)}`
                    : '';
                  return stack
                    ? `[${timestamp}] ${level}: ${message}${metaStr}\n${stack}`
                    : `[${timestamp}] ${level}: ${message}${metaStr}`;
                },
              ),
            ),
      ),
      transports: [
        new winston.transports.Console({
          handleExceptions: true,
          handleRejections: true,
        }),
        // Future Datadog transport:
        // new DatadogTransport({
        //   apiKey: process.env.DD_API_KEY,
        //   service: process.env.DD_SERVICE || 'fau-backend',
        //   ddsource: 'nodejs',
        //   ddtags: `env:${process.env.NODE_ENV || 'development'}`,
        // }),
      ],
      exitOnError: false,
    }),
  ],
  exports: [WinstonModule],
})
export class LoggingModule {}
