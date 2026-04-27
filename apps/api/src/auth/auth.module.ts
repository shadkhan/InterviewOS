import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";
import { AuthenticationError, AuthorizationError, publicRoute, type LoginRequestBody, type RefreshTokenRequestBody } from "./auth.types";
import { AuthGuard } from "./auth.guard";
import { AuthService, LoginRequestSchema, RefreshTokenRequestSchema } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

export interface AuthModuleOptions {
  authService?: AuthService;
  jwtStrategy?: JwtStrategy;
}

export const createAuthModule = (options: AuthModuleOptions = {}): FastifyPluginAsync => {
  return async (app: FastifyInstance): Promise<void> => {
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
};

export const registerAuthModule = async (app: FastifyInstance, options: AuthModuleOptions = {}): Promise<void> => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid request body.",
        issues: error.issues,
      });
    }

    if (error instanceof AuthenticationError) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: error.message,
      });
    }

    if (error instanceof AuthorizationError) {
      return reply.status(403).send({
        error: "Forbidden",
        message: error.message,
      });
    }

    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Unexpected server error.",
    });
  });

  await app.register(createAuthModule(options));
};
