/* Middleware that works with zod schema to validate request body against
the zod schema at runtime */
import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { z } from "zod";

export function validateBody<TSchema extends ZodType>(schema: TSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        // REMOVE THIS AFTER THE SYSTEM WORKS
        console.log("ZOD ERROR TREE:", JSON.stringify(z.treeifyError(result.error), null, 2));

      return res.status(400).json({
        message: "Validation error",
        errors: z.flattenError(result.error),
      });
    }

    // result.data is now correctly typed from the schema
    req.body = result.data as z.infer<TSchema>;
    next();
  };
}
