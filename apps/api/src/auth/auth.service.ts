import { prisma } from "@interviewos/database";
import { z } from "zod";
import { AuthenticationError, type AuthProvider, type AuthenticatedUser, type AuthTokens, type PasswordVerifier } from "./auth.types";
import { JwtStrategy } from "./jwt.strategy";

export const LoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const RefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export class UnconfiguredPasswordVerifier implements PasswordVerifier {
  async verifyPassword(): Promise<boolean> {
    return false;
  }
}

export interface AuthServiceOptions {
  jwtStrategy?: JwtStrategy;
  passwordVerifier?: PasswordVerifier;
}

export class AuthService implements AuthProvider {
  private readonly jwtStrategy: JwtStrategy;
  private readonly passwordVerifier: PasswordVerifier;

  constructor(options: AuthServiceOptions = {}) {
    this.jwtStrategy = options.jwtStrategy ?? new JwtStrategy();
    this.passwordVerifier = options.passwordVerifier ?? new UnconfiguredPasswordVerifier();
  }

  async validateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    const parsedCredentials = LoginRequestSchema.safeParse({ email, password });

    if (!parsedCredentials.success) {
      return null;
    }

    const isPasswordValid = await this.passwordVerifier.verifyPassword(email, password);

    if (!isPasswordValid) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
    };
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new AuthenticationError("Invalid email or password.");
    }

    return this.issueTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const payload = this.jwtStrategy.verify(refreshToken, "refresh");

    return this.issueTokens({
      userId: payload.userId,
      email: payload.email,
    });
  }

  private issueTokens(user: AuthenticatedUser): AuthTokens {
    return {
      accessToken: this.jwtStrategy.sign(user, "access"),
      refreshToken: this.jwtStrategy.sign(user, "refresh"),
      tokenType: "Bearer",
      expiresIn: this.jwtStrategy.accessTokenTtlSeconds,
    };
  }
}
