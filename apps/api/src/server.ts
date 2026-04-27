import Fastify from "fastify";
import { registerAuthModule } from "./auth/auth.module";

export const buildServer = async () => {
  const app = Fastify({
    logger: {
      redact: ["req.headers.authorization", "accessToken", "refreshToken", "password"],
    },
  });

  await registerAuthModule(app);

  app.get(
    "/health",
    {
      config: {
        public: true,
      },
    },
    async () => ({ status: "ok" }),
  );

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
}
