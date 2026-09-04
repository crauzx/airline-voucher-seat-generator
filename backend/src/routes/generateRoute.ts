import { Router } from 'express';
import { generateRequestSchema } from '../validation/schemas';
import { ApiError } from '../errors/ApiError';
import { VoucherService } from '../services/voucherService';

export function createGenerateRoute(service: VoucherService): Router {
  const router = Router();

  router.post('/', (req, res, next) => {
    const parseResult = generateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      next(ApiError.validation(parseResult.error.issues[0]?.message ?? 'Invalid request body'));
      return;
    }

    try {
      const seats = service.generateVoucher(parseResult.data);
      res.status(201).json({ success: true, seats });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
