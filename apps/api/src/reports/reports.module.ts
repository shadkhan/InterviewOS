import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerReportsController, type RegisterReportsControllerOptions } from "./reports.controller";

export const createReportsModule = (
  options: RegisterReportsControllerOptions = {},
): FastifyPluginAsync => {
  return async (app: FastifyInstance): Promise<void> => {
    await registerReportsController(app, options);
  };
};

export const registerReportsModule = async (
  app: FastifyInstance,
  options: RegisterReportsControllerOptions = {},
): Promise<void> => {
  await app.register(createReportsModule(options));
};
