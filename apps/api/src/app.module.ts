import type { FastifyInstance } from "fastify";
import { registerAgentRunsModule } from "./agent-runs/agent-runs.module";
import { registerAuthModule, type AuthModuleOptions } from "./auth/auth.module";
import { registerGlobalExceptionFilter } from "./exception-filter";
import { registerJobTargetsModule } from "./job-targets/job-targets.module";
import { registerReportsModule } from "./reports/reports.module";

export interface AppModuleOptions {
  auth?: AuthModuleOptions;
}

export const registerAppModule = async (
  app: FastifyInstance,
  options: AppModuleOptions = {},
): Promise<void> => {
  registerGlobalExceptionFilter(app);

  await registerAuthModule(app, options.auth);
  await registerJobTargetsModule(app);
  await registerAgentRunsModule(app);
  await registerReportsModule(app);

  app.get(
    "/health",
    {
      config: {
        public: true,
      },
    },
    async () => ({ status: "ok" }),
  );
};
