import { Controller, Get } from '@nestjs/common';
import {
  TAILSCALE_STATUS_ROUTE,
  type TailscaleStatus,
} from '@bbartolome/scriba-contracts/setup-auth';
import { TailscaleStatusService } from './tailscale-status.service';

// The normalised Tailscale status. The global guard covers this route: no cookie check is repeated here.
@Controller()
export class TailscaleStatusController {
  constructor(private readonly status: TailscaleStatusService) {}

  @Get(TAILSCALE_STATUS_ROUTE)
  getTailscaleStatus(): Promise<TailscaleStatus> {
    return this.status.status();
  }
}
