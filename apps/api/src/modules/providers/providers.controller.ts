import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  APP_DEFAULT_ROUTE,
  EFFECTIVE_MODEL_ROUTE,
  KEY_CLEAR_ROUTE,
  KEY_SET_ROUTE,
  MODELS_ROUTE,
  PRESETS_ROUTE,
  PROVIDER_DELETE_ROUTE,
  PROVIDER_UPDATE_ROUTE,
  PROVIDERS_ROUTE,
  effectiveModelQuerySchema,
  keyClearRequestSchema,
  keySetRequestSchema,
  modelChoiceSchema,
  providerCreateSchema,
  providerUpdateSchema,
  type EffectiveModelQuery,
  type KeyClearRequest,
  type KeySetRequest,
  type ModelChoice,
  type ProviderCreate,
  type ProviderUpdate,
} from '@bbartolome/scriba-contracts/providers';
import { ZodValidationPipe } from '../platform/platform.module';
import { ProvidersService } from './providers.service';

// The providers HTTP API, behind Setup & auth's guard. Reads are GET and never mutate; every command is a POST.
// Bodies and the query go through the contract schemas. Each status is set on its route: 201 for a create, 204
// for a delete, and 200 for the other commands (Nest's POST default is 201).
@Controller()
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get(PROVIDERS_ROUTE)
  list() {
    return { providers: this.providers.list() };
  }

  @Post(PROVIDERS_ROUTE)
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(providerCreateSchema)) body: ProviderCreate,
  ) {
    return this.providers.create(body);
  }

  @Get(PRESETS_ROUTE)
  presets() {
    return { presets: this.providers.presets() };
  }

  @Get(APP_DEFAULT_ROUTE)
  appDefault() {
    return { appDefault: this.providers.appDefault() };
  }

  @Post(APP_DEFAULT_ROUTE)
  @HttpCode(200)
  setAppDefault(
    @Body(new ZodValidationPipe(modelChoiceSchema)) body: ModelChoice,
  ) {
    return { appDefault: this.providers.setAppDefault(body) };
  }

  @Post(PROVIDER_UPDATE_ROUTE)
  @HttpCode(200)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(providerUpdateSchema)) body: ProviderUpdate,
  ) {
    return this.providers.update(id, body);
  }

  @Post(PROVIDER_DELETE_ROUTE)
  @HttpCode(204)
  remove(@Param('id') id: string): void {
    this.providers.remove(id);
  }

  @Get(MODELS_ROUTE)
  async models(@Param('id') id: string) {
    return { models: await this.providers.models(id) };
  }

  @Post(KEY_SET_ROUTE)
  @HttpCode(200)
  setKey(
    @Body(new ZodValidationPipe(keySetRequestSchema)) body: KeySetRequest,
  ) {
    return this.providers.setKey(body.providerId, body.key);
  }

  @Post(KEY_CLEAR_ROUTE)
  @HttpCode(200)
  clearKey(
    @Body(new ZodValidationPipe(keyClearRequestSchema)) body: KeyClearRequest,
  ) {
    return this.providers.clearKey(body.providerId);
  }

  @Get(EFFECTIVE_MODEL_ROUTE)
  async effectiveModel(
    @Query(new ZodValidationPipe(effectiveModelQuerySchema))
    query: EffectiveModelQuery,
  ) {
    return this.providers.effectiveModel(query);
  }
}
