/**
 * Validation Middleware
 * Express middleware for validating request bodies, query parameters, and route parameters
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendValidationError, isZodError } from './errors.js';

/**
 * Validate request body
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (isZodError(error)) {
        return sendValidationError(res, error);
      }
      next(error);
    }
  };
}

/**
 * Validate request query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (isZodError(error)) {
        return sendValidationError(res, error);
      }
      next(error);
    }
  };
}

/**
 * Validate route parameters
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (isZodError(error)) {
        return sendValidationError(res, error);
      }
      next(error);
    }
  };
}

/**
 * Validate request body, query, and params together
 */
export function validateRequest<TBody extends z.ZodTypeAny, TQuery extends z.ZodTypeAny, TParams extends z.ZodTypeAny>(options: {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (options.body) {
        req.body = options.body.parse(req.body);
      }
      if (options.query) {
        req.query = options.query.parse(req.query) as any;
      }
      if (options.params) {
        req.params = options.params.parse(req.params) as any;
      }
      next();
    } catch (error) {
      if (isZodError(error)) {
        return sendValidationError(res, error);
      }
      next(error);
    }
  };
}

