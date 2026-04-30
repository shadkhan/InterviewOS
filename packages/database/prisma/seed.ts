import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create or get dev user
  const user = await prisma.user.upsert({
    where: { email: "dev@local" },
    update: {},
    create: {
      id: "local-dev-user",
      email: "dev@local",
      name: "Dev User",
    },
  });

  // Create a sample resume
  const resume = await prisma.resume.upsert({
    where: { id: "seed-resume-1" },
    update: {},
    create: {
      id: "seed-resume-1",
      userId: user.id,
      rawText: `John Doe
Software Engineer
john.doe@example.com | (555) 123-4567

EXPERIENCE
Senior Software Engineer - Tech Corp (2020-Present)
- Led team of 5 engineers on microservices architecture
- Improved API performance by 40%
- Implemented CI/CD pipeline

Software Engineer - StartupXYZ (2018-2020)
- Built full-stack web applications
- Maintained 99.9% uptime
- Mentored 2 junior developers

SKILLS
Languages: JavaScript, TypeScript, Python, Go
Frameworks: React, Node.js, FastAPI
Databases: PostgreSQL, MongoDB, Redis
Cloud: AWS, GCP

EDUCATION
BS Computer Science - State University (2018)`,
      parsedProfile: {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "(555) 123-4567",
        experience: [
          {
            title: "Senior Software Engineer",
            company: "Tech Corp",
            duration: "2020-Present",
          },
          {
            title: "Software Engineer",
            company: "StartupXYZ",
            duration: "2018-2020",
          },
        ],
        skills: [
          "JavaScript",
          "TypeScript",
          "Python",
          "Go",
          "React",
          "Node.js",
          "AWS",
        ],
      },
    },
  });

  // Create sample job targets
  const jobTargets = [
    {
      id: "seed-job-1",
      companyName: "Google",
      roleTitle: "Senior Software Engineer",
      location: "Mountain View, CA",
      seniority: "Senior",
      jobDescription: `We're looking for a Senior Software Engineer to join our Search team...
Requirements:
- 5+ years of software engineering experience
- Strong knowledge of distributed systems
- Experience with large-scale data processing
- Excellent problem-solving skills`,
    },
    {
      id: "seed-job-2",
      companyName: "Meta",
      roleTitle: "Backend Engineer",
      location: "Menlo Park, CA",
      seniority: "Mid-Level",
      jobDescription: `Meta is hiring Backend Engineers for our Infrastructure team...
Requirements:
- 3+ years of backend development experience
- Proficiency in C++ or Java
- Experience with high-traffic systems
- Familiarity with microservices architecture`,
    },
    {
      id: "seed-job-3",
      companyName: "Amazon",
      roleTitle: "Full Stack Engineer",
      location: "Seattle, WA",
      seniority: "Mid-Level",
      jobDescription: `Join Amazon Web Services (AWS) as a Full Stack Engineer...
Requirements:
- 3+ years of full-stack development experience
- Expertise in React and Node.js
- Strong database design skills
- Passion for building scalable systems`,
    },
  ];

  for (const jobTarget of jobTargets) {
    await prisma.jobTarget.upsert({
      where: { id: jobTarget.id },
      update: {},
      create: {
        id: jobTarget.id,
        userId: user.id,
        resumeId: resume.id,
        companyName: jobTarget.companyName,
        roleTitle: jobTarget.roleTitle,
        location: jobTarget.location,
        seniority: jobTarget.seniority,
        jobDescription: jobTarget.jobDescription,
        status: "pending",
      },
    });
  }

  console.log("✅ Seed data created successfully!");
  console.log(`   - User: ${user.email}`);
  console.log(`   - Resume: ${resume.id}`);
  console.log(`   - Job Targets: ${jobTargets.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
