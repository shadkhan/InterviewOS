import { AgentStateSchema } from "@interviewos/shared";
import type { InterviewPrepNode } from "../state/interview-prep.state";

const RequiredAgentInputSchema = AgentStateSchema.pick({
  userId: true,
  projectId: true,
  companyName: true,
  roleTitle: true,
  jobDescription: true,
  resumeText: true,
});

export const intakeNode: InterviewPrepNode = async (state) => {
  console.log("[Intake] starting");
  RequiredAgentInputSchema.parse({
    userId: state.userId,
    projectId: state.projectId,
    companyName: state.companyName,
    roleTitle: state.roleTitle,
    jobDescription: state.jobDescription,
    resumeText: state.resumeText,
  });
  console.log("[Intake] done");

  return state;
};
