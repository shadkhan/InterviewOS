import type { FastifyInstance } from "fastify";
import { getRequestUser } from "../auth/auth.types";
import { ReportsService } from "../reports/reports.service";
import { CreateJobTargetSchema } from "./dto/create-job-target.dto";
import { JobTargetsService } from "./job-targets.service";

export interface RegisterJobTargetsControllerOptions {
  jobTargetsService?: JobTargetsService;
  reportsService?: ReportsService;
}

export const registerJobTargetsController = async (
  app: FastifyInstance,
  options: RegisterJobTargetsControllerOptions = {},
): Promise<void> => {
  const jobTargetsService = options.jobTargetsService ?? new JobTargetsService();
  const reportsService = options.reportsService ?? new ReportsService();

  app.post("/job-targets", async (request, reply) => {
    const user = getRequestUser(request);
    const body = CreateJobTargetSchema.parse(request.body);
    const result = await jobTargetsService.create(user.userId, body);

    return reply.status(202).send(result);
  });

  app.get<{ Params: { id: string } }>("/job-targets/:id", async (request) => {
    const user = getRequestUser(request);

    return jobTargetsService.findByIdForUser(user.userId, request.params.id);
  });

  app.get<{ Params: { id: string } }>("/job-targets/:id/report", async (request) => {
    const user = getRequestUser(request);

    return reportsService.getJobTargetReport(user.userId, request.params.id);
  });
};
