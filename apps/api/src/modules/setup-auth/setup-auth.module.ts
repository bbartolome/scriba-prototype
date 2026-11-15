import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  PlatformModule,
  SCRIBA_ENV,
  SettingsService,
  type ScribaEnv,
} from '../platform/platform.module';
import { REQUEST_POLICY, buildRequestPolicy } from './request-policy';
import { SETUP_AUTH_SECTION_DEF } from './setup-auth.section';
import { SetupAuthGuard } from './setup-auth.guard';
import { SetupCookieSigner } from './setup-cookie.signer';
import { SetupFlowController } from './setup-flow.controller';
import { SetupSessionController } from './setup-session.controller';
import { SetupStatusController } from './setup-status.controller';
import { SetupStatusService } from './setup-status.service';
import { SetupTokenStore } from './setup-token.store';
import { PreferencesReader } from './setup-preferences.reader';

export { RequestIdentity } from './request-identity';
export { PreferencesReader } from './setup-preferences.reader';

const SETUP_AUTH_SECTION_REGISTRATION = 'SETUP_AUTH_SECTION_REGISTRATION';

// Setup and auth: the setup token, setup-url, cookie signing and the setupAuth settings section.
@Module({
  imports: [PlatformModule],
  controllers: [
    SetupSessionController,
    SetupStatusController,
    SetupFlowController,
  ],
  providers: [
    {
      provide: SETUP_AUTH_SECTION_REGISTRATION,
      inject: [SettingsService],
      useFactory: (settings: SettingsService): true => {
        settings.register(SETUP_AUTH_SECTION_DEF);
        return true;
      },
    },
    SetupTokenStore,
    SetupCookieSigner,
    SetupStatusService,
    PreferencesReader,
    {
      provide: REQUEST_POLICY,
      inject: [SCRIBA_ENV],
      useFactory: (env: ScribaEnv) => buildRequestPolicy(env),
    },
    // The default-deny guard for every route of the composed app.
    { provide: APP_GUARD, useClass: SetupAuthGuard },
  ],
  exports: [SetupTokenStore, SetupCookieSigner, PreferencesReader],
})
export class SetupAuthModule {}
