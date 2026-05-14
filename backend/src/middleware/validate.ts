import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Source of request data to validate against a Zod schema.
 */
type ValidationSource = 'body' | 'params' | 'query';

/**
 * Configuration for a single validation target.
 */
interface ValidationConfig {
  schema: ZodSchema;
  source: ValidationSource;
}

/**
 * Formats Zod validation errors into a field-to-message mapping.
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.');
    // Use the first error per field
    if (!details[field]) {
      details[field] = issue.message;
    }
  }

  return details;
}

/**
 * Middleware factory that validates a single request source (body, params, or query)
 * against a Zod schema.
 *
 * On success, replaces the source data with the parsed/validated result and calls next().
 * On failure, returns 400 with code VALIDATION_ERROR and field-specific details.
 *
 * @example
 * router.post('/tickets', validate(createTicketSchema, 'body'), controller.create);
 */
export function validate(schema: ZodSchema, source: ValidationSource = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const result = schema.safeParse(data);

    if (!result.success) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid',
        details: formatZodErrors(result.error),
      });
      return;
    }

    // Attach parsed/validated data back to the request
    req[source] = result.data;
    next();
  };
}

/**
 * Middleware factory that validates multiple request sources at once.
 * Useful when you need to validate body, params, and/or query in a single middleware.
 *
 * On success, replaces each source with parsed data and calls next().
 * On failure, returns 400 with combined field-specific details from all sources.
 *
 * @example
 * router.patch(
 *   '/tickets/:id/assign',
 *   validateMultiple([
 *     { schema: ticketIdParamSchema, source: 'params' },
 *     { schema: assignTicketSchema, source: 'body' },
 *   ]),
 *   controller.assign
 * );
 */
export function validateMultiple(configs: ValidationConfig[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allDetails: Record<string, string> = {};
    let hasErrors = false;

    for (const config of configs) {
      const data = req[config.source];
      const result = config.schema.safeParse(data);

      if (!result.success) {
        hasErrors = true;
        const errors = formatZodErrors(result.error);
        // Prefix with source for params/query to avoid field name collisions
        for (const [field, message] of Object.entries(errors)) {
          const key = config.source === 'body' ? field : `${config.source}.${field}`;
          if (!allDetails[key]) {
            allDetails[key] = message;
          }
        }
      } else {
        // Attach parsed data even if other sources fail (will be overwritten if we return error)
        req[config.source] = result.data;
      }
    }

    if (hasErrors) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid',
        details: allDetails,
      });
      return;
    }

    next();
  };
}
