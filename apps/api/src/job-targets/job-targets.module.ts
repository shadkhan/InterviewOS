import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerJobTargetsController, type RegisterJobTargetsControllerOptions } from "./job-targets.controller";

export const createJobTargetsModule = (
  options: RegisterJobTargetsControllerOptions = {},
): FastifyPluginAsync => {
  return async (app: FastifyInstance): Promise<void> => {
    await registerJobTargetsController(app, options);
  };
};

export const registerJobTargetsModule = async (
  app: FastifyInstance,
  options: RegisterJobTargetsControllerOptions = {},
): Promise<void> => {
  await app.register(createJobTargetsModule(options));
};
