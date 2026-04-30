import { addInterviewPrepJob } from "@interviewos/agents";
import { prisma } from "@interviewos/database";
import type { CreateJobTargetDto } from "./dto/create-job-target.dto";
import { NotFoundError, PersistenceError, RateLimitError } from "../http-errors";

const MAX_JOB_TARGETS_PER_HOUR = process.env.NODE_ENV === "production" ? 5 : 100;

export class JobTargetsService {
  async create(userId: string, input: CreateJobTargetDto) {
    await this.enforceHourlyLimit(userId);

    try {
      const jobTarget = await prisma.$transaction(async (tx) => {
        const resume = await tx.resume.create({
          data: {
            userId,
            rawText: input.resumeText,
          },
          select: {
            id: true,
          },
        });

        return tx.jobTarget.create({
          data: {
            userId,
            resumeId: resume.id,
            companyName: input.companyName,
            roleTitle: input.roleTitle,
            location: input.location,
            seniority: input.seniority,
            jobDescription: input.jobDescription,
            status: "pending",
          },
          select: {
            id: true,
          },
        });
      });

      const { agentRunId } = await addInterviewPrepJob({
        jobTargetId: jobTarget.id,
        userId,
        resumeText: input.resumeText,
        jobDescription: input.jobDescription,
        companyName: input.companyName,
        roleTitle: input.roleTitle,
        location: input.location,
        seniority: input.seniority,
        interviewDate: input.interviewDate,
      });

      return {
        jobTargetId: jobTarget.id,
        agentRunId,
        status: "pending" as const,
      };
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }

      throw new PersistenceError("Unable to create job target.");
    }
  }

  async findByIdForUser(userId: string, id: string) {
    try {
      const jobTarget = await prisma.jobTarget.findFirst({
        where: {
          id,
          userId,
        },
        select: {
          id: true,
          userId: true,
          companyName: true,
          roleTitle: true,
          location: true,
          seniority: true,
          jobDescription: true,
          status: true,
          resumeId: true,
          createdAt: true,
          updatedAt: true,
          agentRuns: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              status: true,
              createdAt: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      });

      if (!jobTarget) {
        throw new NotFoundError("Job target not found.");
      }

      return jobTarget;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new PersistenceError("Unable to load job target.");
    }
  }

  private async enforceHourlyLimit(userId: string): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.jobTarget.count({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
    });

    if (recentCount >= MAX_JOB_TARGETS_PER_HOUR) {
      throw new RateLimitError("Maximum 5 job targets per hour reached.");
    }
  }
}
