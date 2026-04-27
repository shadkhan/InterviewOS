import type { InterviewPrepNode } from "../state/interview-prep.state";

export const prepPlanNode: InterviewPrepNode = async (state) => {
  console.log("[PrepPlan] starting");
  console.log("[PrepPlan] done");

  return state;
};
