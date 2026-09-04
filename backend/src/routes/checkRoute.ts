import { Router } from 'express';
import { checkRequestSchema } from '../validation/schemas';
import { ApiError } from '../errors/ApiError';
import { VoucherService } from '../services/voucherService';

export function createCheckRoute(service: VoucherService): Router {
  const router = Router();

  router.post('/', (req, res, next) => {
    const parseResult = checkRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      next(ApiError.validation(parseResult.error.issues[0]?.message ?? 'Invalid request body'));
      return;
    }

    try {
      const exists = service.checkExists(parseResult.data.flightNumber, parseResult.data.date);
      res.status(200).json({ exists });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
