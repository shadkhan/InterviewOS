import type { FastifyInstance } from "fastify";
import { getRequestUser } from "../auth/auth.types";
import { ReportsService } from "./reports.service";

export interface RegisterReportsControllerOptions {
  reportsService?: ReportsService;
}

export const registerReportsController = async (
  app: FastifyInstance,
  options: RegisterReportsControllerOptions = {},
): Promise<void> => {
  const reportsService = options.reportsService ?? new ReportsService();

  app.get<{ Params: { id: string } }>("/reports/job-targets/:id", async (request) => {
    const user = getRequestUser(request);

    return reportsService.getJobTargetReport(user.userId, request.params.id);
  });
};
