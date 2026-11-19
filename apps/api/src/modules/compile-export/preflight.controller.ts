import { Controller, HttpCode, Post } from '@nestjs/common';
import {
  PREFLIGHT_ROUTE,
  type PreflightResult,
} from '@bbartolome/scriba-contracts/compile-export';
import { PreflightService } from './preflight.service';

// The preflight route, behind Setup & auth's guard (P14). It takes no body and writes nothing.
@Controller()
export class PreflightController {
  constructor(private readonly preflight: PreflightService) {}

  @Post(PREFLIGHT_ROUTE)
  @HttpCode(200)
  run(): PreflightResult {
    return this.preflight.run(new Date());
  }
}
