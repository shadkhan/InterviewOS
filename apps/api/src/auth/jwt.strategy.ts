import { createHmac, timingSafeEqual } from "node:crypto";
import { AuthenticationError, type AuthenticatedUser, type InternalJwtPayload, type JwtPayload, type TokenKind } from "./auth.types";

const encoder = new TextEncoder();

export interface JwtStrategyOptions {
  secret?: string;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
}

export class JwtStrategy {
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  private readonly secret: string;

  constructor(options: JwtStrategyOptions = {}) {
    this.secret = options.secret ?? process.env.JWT_SECRET ?? "";
    this.accessTokenTtlSeconds = options.accessTokenTtlSeconds ?? 15 * 60;
    this.refreshTokenTtlSeconds = options.refreshTokenTtlSeconds ?? 7 * 24 * 60 * 60;

    if (!this.secret) {
      throw new AuthenticationError("JWT_SECRET is required.");
    }
  }

  sign(user: AuthenticatedUser, tokenKind: TokenKind): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const ttl = tokenKind === "access" ? this.accessTokenTtlSeconds : this.refreshTokenTtlSeconds;
    const payload: InternalJwtPayload = {
      userId: user.userId,
      email: user.email,
      tokenKind,
      iat: issuedAt,
      exp: issuedAt + ttl,
    };

    return this.encode(payload);
  }

  verify(token: string, expectedTokenKind: TokenKind): JwtPayload {
    const payload = this.decode(token);

    if (payload.tokenKind !== expectedTokenKind) {
      throw new AuthenticationError("Invalid token type.");
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new AuthenticationError("Token has expired.");
    }

    return {
      userId: payload.userId,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  private encode(payload: InternalJwtPayload): string {
    const header = { alg: "HS256", typ: "JWT" };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = this.signData(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private decode(token: string): InternalJwtPayload {
    const parts = token.split(".");

    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new AuthenticationError("Malformed token.");
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = this.signData(`${encodedHeader}.${encodedPayload}`);

    if (!safeEquals(signature, expectedSignature)) {
      throw new AuthenticationError("Invalid token signature.");
    }

    const header = parseJson<{ alg?: string; typ?: string }>(base64UrlDecode(encodedHeader));

    if (header.alg !== "HS256" || header.typ !== "JWT") {
      throw new AuthenticationError("Unsupported token header.");
    }

    const payload = parseJson<InternalJwtPayload>(base64UrlDecode(encodedPayload));

    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      (payload.tokenKind !== "access" && payload.tokenKind !== "refresh")
    ) {
      throw new AuthenticationError("Invalid token payload.");
    }

    return payload;
  }

  private signData(data: string): string {
    return createHmac("sha256", this.secret).update(data).digest("base64url");
  }
}

const base64UrlEncode = (value: string): string => Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string): string => Buffer.from(value, "base64url").toString("utf8");

const parseJson = <T>(value: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new AuthenticationError("Invalid token JSON.");
  }
};

const safeEquals = (left: string, right: string): boolean => {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  return timingSafeEqual(leftBytes, rightBytes);
};
