import { Module, type DynamicModule, type Type } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import {
  EVENTS_ROUTE,
  HEALTHZ_ROUTE,
} from '@bbartolome/scriba-contracts/platform';
import {
  PlatformModule,
  SCRIBA_ENV,
  type ScribaEnv,
} from './modules/platform/platform.module';
import { SetupAuthModule } from './modules/setup-auth/setup-auth.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ProjectStoreModule } from './modules/project-store/project-store.module';
import { AgentLoopModule } from './modules/agent-loop/agent-loop.module';
import { ToolRegistryModule } from './modules/tool-registry/tool-registry.module';
import { GraphRunnerModule } from './modules/graph-runner/graph-runner.module';

// The composition root. Each feature module adds one import here.
export const COMPOSED_MODULES: Type<unknown>[] = [
  PlatformModule,
  SetupAuthModule,
  ProvidersModule,
  ProjectStoreModule,
  AgentLoopModule,
  ToolRegistryModule,
  GraphRunnerModule,
];

export interface RootModuleOptions {
  env: ScribaEnv;
  staticRoot: string;
  modules?: Type<unknown>[];
}

@Module({})
class RootModule {}

// Non-API GETs get index.html (SPA fallback). Excluded paths reach Nest's own routes.
export function buildRootModule(options: RootModuleOptions): DynamicModule {
  return {
    module: RootModule,
    global: true,
    providers: [{ provide: SCRIBA_ENV, useValue: options.env }],
    exports: [SCRIBA_ENV],
    imports: [
      ServeStaticModule.forRoot({
        rootPath: options.staticRoot,
        exclude: ['/api{/*rest}', HEALTHZ_ROUTE, EVENTS_ROUTE],
        // A directory request (GET /media) is served by the SPA fallback, not redirected, so the CSP header stays.
        serveStaticOptions: { redirect: false },
      }),
      ...(options.modules ?? COMPOSED_MODULES),
    ],
  };
}
