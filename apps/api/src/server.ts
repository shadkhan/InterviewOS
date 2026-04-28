import Fastify from "fastify";
import { registerAppModule } from "./app.module";

export const buildServer = async () => {
  const app = Fastify({
    logger: {
      redact: ["req.headers.authorization", "accessToken", "refreshToken", "password"],
    },
  });

  await registerAppModule(app);

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
}
