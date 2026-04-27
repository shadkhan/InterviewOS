import type { InterviewPrepNode } from "../state/interview-prep.state";

export const finalizeNode: InterviewPrepNode = async (state) => {
  console.log("[Finalize] starting");
  console.log("[Finalize] done");

  return state;
};
