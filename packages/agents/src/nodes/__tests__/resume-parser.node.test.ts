import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { MockLLMProvider } from "../../providers";
import { PromptLoader } from "../../prompts";
import { createInitialInterviewPrepState } from "../../state";
import { createResumeParserNode } from "../resume-parser.node";

const createBaseState = (resumeText: string) =>
  createInitialInterviewPrepState({
    userId: "user_1",
    projectId: "job_1",
    companyName: "Example Co",
    roleTitle: "Senior Software Engineer",
    jobDescription: "Build reliable distributed systems.",
    resumeText,
  });

const loader = new PromptLoader(path.resolve(process.cwd(), "../.."));
const silentLogger = { log: () => undefined };

test("parses a valid resume with MockLLMProvider", async () => {
  const profile = {
    currentTitle: "Senior Software Engineer",
    totalExperience: "8 years",
    coreSkills: ["Backend engineering", "Distributed systems"],
    technicalSkills: ["TypeScript", "Node.js", "PostgreSQL"],
    industries: ["SaaS"],
    projects: [
      {
        name: "Payments Platform",
        description: "Led migration that reduced payment failures by 18%.",
        techStack: ["Node.js", "PostgreSQL"],
      },
    ],
    achievements: ["Reduced payment failures by 18%"],
    leadershipSignals: ["Mentored 3 engineers"],
    education: [
      {
        degree: "B.Tech Computer Science",
        institution: "Example University",
        year: "2016",
      },
    ],
    certifications: ["AWS Certified Developer"],
    gapsOrWeaknesses: [],
  };

  const node = createResumeParserNode({
    llmProvider: new MockLLMProvider({ structuredResponse: profile }),
    loader,
    logger: silentLogger,
  });

  const result = await node(
    createBaseState(
      "Senior Software Engineer with 8 years of experience building TypeScript and Node.js systems. Reduced payment failures by 18% and mentored 3 engineers.",
    ),
  );

  assert.deepEqual(result.resumeProfile, profile);
  assert.equal(result.warnings, undefined);
});

test("returns an empty profile and warning for short resume text", async () => {
  const node = createResumeParserNode({
    llmProvider: new MockLLMProvider({
      structuredResponse: {
        currentTitle: "Should not be called",
      },
    }),
    loader,
    logger: silentLogger,
  });

  const result = await node(createBaseState("Too short"));

  assert.equal(result.resumeProfile?.currentTitle, "");
  assert.deepEqual(result.resumeProfile?.coreSkills, []);
  assert.deepEqual(result.warnings, ["Resume text is too short to parse reliably"]);
});
