import type { FastifyReply, FastifyRequest, RouteShorthandOptionsWithHandler } from "fastify";

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface JwtPayload extends AuthenticatedUser {
  iat: number;
  exp: number;
}

export type TokenKind = "access" | "refresh";

export interface InternalJwtPayload extends JwtPayload {
  tokenKind: TokenKind;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RefreshTokenRequestBody {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface PasswordVerifier {
  verifyPassword(email: string, password: string): Promise<boolean>;
}

export interface AuthProvider {
  validateUser(email: string, password: string): Promise<AuthenticatedUser | null>;
  login(email: string, password: string): Promise<AuthTokens>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
}

export interface PublicRouteConfig {
  public?: boolean;
}

export type PublicRouteOptions = RouteShorthandOptionsWithHandler & {
  config?: RouteShorthandOptionsWithHandler["config"] & PublicRouteConfig;
};

export class AuthenticationError extends Error {
  constructor(message = "Authentication failed.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Access denied.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export const publicRoute = <T extends PublicRouteOptions>(routeOptions: T): T => ({
  ...routeOptions,
  config: {
    ...routeOptions.config,
    public: true,
  },
});

export const assertOwnsUserResource = (authenticatedUserId: string, resourceUserId: string): void => {
  if (authenticatedUserId !== resourceUserId) {
    throw new AuthorizationError("Users can only access their own data.");
  }
};

export const getRequestUser = (request: FastifyRequest): AuthenticatedUser => {
  if (!request.user) {
    throw new AuthenticationError("Missing authenticated user.");
  }

  return request.user;
};

export type AuthPreHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }

  interface FastifyContextConfig {
    public?: boolean;
  }
}
