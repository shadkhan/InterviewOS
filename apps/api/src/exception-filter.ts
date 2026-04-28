import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AuthenticationError, AuthorizationError } from "./auth/auth.types";
import { NotFoundError, PersistenceError, RateLimitError } from "./http-errors";

export const registerGlobalExceptionFilter = (app: FastifyInstance): void => {
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "request failed");

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

    if (error instanceof NotFoundError) {
      return reply.status(404).send({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error instanceof RateLimitError) {
      return reply.status(429).send({
        error: "Too Many Requests",
        message: error.message,
      });
    }

    if (error instanceof PersistenceError) {
      return reply.status(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }

    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Unexpected server error.",
    });
  });
};
