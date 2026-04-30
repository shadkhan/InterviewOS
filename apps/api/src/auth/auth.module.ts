import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { publicRoute, type LoginRequestBody, type RefreshTokenRequestBody } from "./auth.types";
import { AuthGuard } from "./auth.guard";
import { AuthService, LoginRequestSchema, RefreshTokenRequestSchema } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

export interface AuthModuleOptions {
  authService?: AuthService;
  jwtStrategy?: JwtStrategy;
}

export const createAuthModule = (options: AuthModuleOptions = {}): FastifyPluginAsync => {
  const plugin: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
    const jwtStrategy = options.jwtStrategy ?? new JwtStrategy();
    const authService = options.authService ?? new AuthService({ jwtStrategy });
    const authGuard = new AuthGuard(jwtStrategy);

    app.decorateRequest("user", undefined);
    app.addHook("preHandler", authGuard.preHandler);

    app.post(
      "/auth/login",
      publicRoute({
        handler: async (request, reply) => {
          const body = LoginRequestSchema.parse(request.body) as LoginRequestBody;
          const tokens = await authService.login(body.email, body.password);

          return reply.send(tokens);
        },
      }),
    );

    app.post(
      "/auth/refresh",
      publicRoute({
        handler: async (request, reply) => {
          const body = RefreshTokenRequestSchema.parse(request.body) as RefreshTokenRequestBody;
          const tokens = await authService.refreshToken(body.refreshToken);

          return reply.send(tokens);
        },
      }),
    );
  };

  return fp(plugin, { name: "auth-module" });
};

export const registerAuthModule = async (app: FastifyInstance, options: AuthModuleOptions = {}): Promise<void> => {
  await app.register(createAuthModule(options));
};
