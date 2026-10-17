import { ZodError } from 'zod';

/**
 * Zod validation middleware for request bodies, queries, and params.
 * Converts Zod validation errors into user-friendly Bengali messages.
 */
export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstError = err.errors[0];
        const message = firstError?.message || 'ইনপুট তথ্যে ভুল রয়েছে';
        return res.status(400).json({
          error: {
            message,
            fields: err.flatten().fieldErrors,
          },
        });
      }
      next(err);
    }
  };
}

export default validate;
