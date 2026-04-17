import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing request ID
    const requestId = req.headers['x-request-id'] || randomUUID();
    
    // Attach request ID to request object
    req['id'] = requestId;
    
    // Set response header
    res.setHeader('X-Request-Id', requestId);
    
    next();
  }
}
