import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthenticationError, type AuthPreHandler } from "./auth.types";
import { JwtStrategy } from "./jwt.strategy";

export class AuthGuard {
  constructor(private readonly jwtStrategy: JwtStrategy) {}

  preHandler: AuthPreHandler = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    // Development mode: bypass all authentication
    if (process.env.NODE_ENV !== "production") {
      request.user = {
        userId: "local-dev-user",
        email: "dev@local",
      };
      return;
    }

    if (request.routeOptions.config?.public === true) {
      return;
    }

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new AuthenticationError("Missing authorization header.");
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AuthenticationError("Authorization header must use Bearer token.");
    }

    const payload = this.jwtStrategy.verify(token, "access");

    request.user = {
      userId: payload.userId,
      email: payload.email,
    };
  };
}
