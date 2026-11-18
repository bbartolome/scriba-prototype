import { Controller, Get } from '@nestjs/common';
import {
  MANUSCRIPT_ROUTE,
  type ManuscriptView,
} from '@bbartolome/scriba-contracts/compile-export';
import { ManuscriptService } from './manuscript.service';

// The compile-export reads, behind Setup & auth's guard. A GET never mutates.
@Controller()
export class ManuscriptController {
  constructor(private readonly manuscript: ManuscriptService) {}

  @Get(MANUSCRIPT_ROUTE)
  view(): ManuscriptView {
    return this.manuscript.view();
  }
}
