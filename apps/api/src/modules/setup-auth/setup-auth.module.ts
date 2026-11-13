import { Module } from '@nestjs/common';
import { PlatformModule, SettingsService } from '../platform/platform.module';
import { SETUP_AUTH_SECTION_DEF } from './setup-auth.section';
import { SetupCookieSigner } from './setup-cookie.signer';
import { SetupSessionController } from './setup-session.controller';
import { SetupStatusController } from './setup-status.controller';
import { SetupStatusService } from './setup-status.service';
import { SetupTokenStore } from './setup-token.store';

const SETUP_AUTH_SECTION_REGISTRATION = 'SETUP_AUTH_SECTION_REGISTRATION';

// Setup and auth: the setup token, setup-url, cookie signing and the setupAuth settings section.
@Module({
  imports: [PlatformModule],
  controllers: [SetupSessionController, SetupStatusController],
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
  ],
  exports: [SetupTokenStore, SetupCookieSigner],
})
export class SetupAuthModule {}
