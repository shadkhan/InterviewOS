import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { publicRoute } from "../auth/auth.types";
import { SettingsService } from "./settings.service";

const UpdateSettingsSchema = z
  .object({
    llmProvider: z.string().optional(),
    apiKeys: z.record(z.string()).optional(),
  })
  .strict();

export const registerSettingsModule = async (app: FastifyInstance): Promise<void> => {
  const service = new SettingsService();

  app.get("/settings", publicRoute({ handler: async () => service.getSettings() }));

  app.put(
    "/settings",
    publicRoute({
      handler: async (request, reply) => {
        const body = UpdateSettingsSchema.parse(request.body);
        await service.updateSettings(body);
        return reply.status(200).send({ success: true });
      },
    }),
  );
};
