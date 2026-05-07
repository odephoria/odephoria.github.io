import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, studySessionsTable, insertStudySessionSchema } from "@workspace/db";

const router = Router();

const MODEL = "claude-sonnet-4-6";

router.post("/study/generate-quiz", async (req, res) => {
  try {
    const { material, topic, count = 8, difficultyHint = "" } = req.body;
    if (!material) {
      return res.status(400).json({ error: "material is required" });
    }

    const topicLine = topic ? `Topic focus: ${topic}` : "";
    const diffLine = difficultyHint ? `\nDifficulty guidance: ${difficultyHint}` : "";
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: "You are a quiz generator. Return ONLY valid JSON, no markdown, no explanation.",
      messages: [
        {
          role: "user",
          content: `Generate ${count} multiple choice quiz questions based on this study material. ${topicLine}${diffLine}
Return ONLY a JSON array like:
[{"question":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","difficulty":"easy|medium|hard"}]
where answer is the index (0-3) of the correct option.

Material:
${material.slice(0, 8000)}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const cleaned = text.trim().replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);
    return res.json(questions);
  } catch (err) {
    req.log.error({ err }, "Error generating quiz");
    return res.status(500).json({ error: "Failed to generate quiz" });
  }
});

router.post("/study/generate-flashcards", async (req, res) => {
  try {
    const { material, topic, count = 12 } = req.body;
    if (!material) {
      return res.status(400).json({ error: "material is required" });
    }

    const topicLine = topic ? `Topic focus: ${topic}` : "";
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: "You are a flashcard generator. Return ONLY valid JSON, no markdown.",
      messages: [
        {
          role: "user",
          content: `Generate ${count} flashcards from this material. ${topicLine}
Return ONLY a JSON array like:
[{"front":"term or question","back":"definition or answer","hint":"optional memory hint"}]

Material:
${material.slice(0, 8000)}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const cleaned = text.trim().replace(/```json|```/g, "").trim();
    const cards = JSON.parse(cleaned);
    return res.json(cards);
  } catch (err) {
    req.log.error({ err }, "Error generating flashcards");
    return res.status(500).json({ error: "Failed to generate flashcards" });
  }
});

router.post("/study/generate-summary", async (req, res) => {
  try {
    const { material, topic } = req.body;
    if (!material) {
      return res.status(400).json({ error: "material is required" });
    }

    const topicLine = topic ? `Topic focus: ${topic}` : "";
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: "You are a study assistant that creates structured summaries. Return ONLY valid JSON.",
      messages: [
        {
          role: "user",
          content: `Create a comprehensive study summary from this material. ${topicLine}
Return ONLY a JSON object like:
{
  "title": "Topic Title",
  "overview": "2-3 sentence overview",
  "keyPoints": ["point 1", "point 2", ...],
  "concepts": [{"term": "term", "definition": "definition"}, ...],
  "examTips": ["tip 1", "tip 2", ...],
  "fullText": "Full markdown summary text with ## headers and bullet points"
}

Material:
${material.slice(0, 8000)}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = text.trim().replace(/```json|```/g, "").trim();
    const summary = JSON.parse(cleaned);
    return res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Error generating summary");
    return res.status(500).json({ error: "Failed to generate summary" });
  }
});

router.post("/study/gap-detection", async (req, res) => {
  try {
    const { material, wrongAnswers } = req.body;
    if (!material || !wrongAnswers) {
      return res.status(400).json({ error: "material and wrongAnswers are required" });
    }

    const wrongSummary = wrongAnswers
      .map((wa: { question: string; yourAnswer: string; correctAnswer: string }) =>
        `Q: ${wa.question}\nYour answer: ${wa.yourAnswer}\nCorrect: ${wa.correctAnswer}`
      )
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: "You are a learning analyst. Return ONLY valid JSON.",
      messages: [
        {
          role: "user",
          content: `Analyze these wrong answers and detect knowledge gaps. Return ONLY JSON:
{
  "weakAreas": [{"topic": "...", "severity": "high|medium|low", "recommendation": "..."}],
  "overallScore": 0.75,
  "studyPriorities": ["priority 1", "priority 2", ...]
}

Wrong answers:
${wrongSummary}

Study material context:
${material.slice(0, 4000)}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = text.trim().replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error detecting gaps");
    return res.status(500).json({ error: "Failed to detect gaps" });
  }
});

router.post("/study/study-plan", async (req, res) => {
  try {
    const { material, goal, daysAvailable = 7 } = req.body;
    if (!material) {
      return res.status(400).json({ error: "material is required" });
    }

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: "You are a study planner. Return ONLY valid JSON.",
      messages: [
        {
          role: "user",
          content: `Create a ${daysAvailable}-day study plan for this material.${goal ? ` Goal: ${goal}` : ""}
Return ONLY JSON:
{
  "title": "Study Plan Title",
  "totalDays": ${daysAvailable},
  "sessions": [
    {"day": 1, "focus": "Topic", "activities": ["activity 1", "activity 2"], "duration": "45 min"},
    ...
  ]
}

Material:
${material.slice(0, 6000)}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = text.trim().replace(/```json|```/g, "").trim();
    const plan = JSON.parse(cleaned);
    return res.json(plan);
  } catch (err) {
    req.log.error({ err }, "Error generating study plan");
    return res.status(500).json({ error: "Failed to generate study plan" });
  }
});

router.get("/study/sessions", async (req, res) => {
  try {
    const { desc } = await import("drizzle-orm");
    const sessions = await db
      .select()
      .from(studySessionsTable)
      .orderBy(desc(studySessionsTable.createdAt))
      .limit(100);
    return res.json(sessions);
  } catch (err) {
    req.log.error({ err }, "Error listing study sessions");
    return res.status(500).json({ error: "Failed to list sessions" });
  }
});

router.post("/study/sessions", async (req, res) => {
  try {
    const parsed = insertStudySessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid session data" });
    }
    const [session] = await db.insert(studySessionsTable).values(parsed.data).returning();
    return res.status(201).json(session);
  } catch (err) {
    req.log.error({ err }, "Error creating study session");
    return res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/study/progress", async (req, res) => {
  try {
    const { desc, sql } = await import("drizzle-orm");
    const sessions = await db
      .select()
      .from(studySessionsTable)
      .orderBy(desc(studySessionsTable.createdAt))
      .limit(200);

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);
    const scoredSessions = sessions.filter((s) => s.score != null);
    const averageScore =
      scoredSessions.length > 0
        ? scoredSessions.reduce((acc, s) => acc + (s.score ?? 0), 0) / scoredSessions.length
        : 0;

    const recentSessions = sessions.slice(0, 10);

    const topicMap: Record<string, { sessions: number; totalScore: number }> = {};
    for (const s of sessions) {
      if (!topicMap[s.topic]) topicMap[s.topic] = { sessions: 0, totalScore: 0 };
      topicMap[s.topic].sessions++;
      topicMap[s.topic].totalScore += s.score ?? 0;
    }
    const topTopics = Object.entries(topicMap)
      .map(([topic, data]) => ({
        topic,
        sessions: data.sessions,
        avgScore: data.sessions > 0 ? data.totalScore / data.sessions : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    const streakDays = computeStreak(sessions.map((s) => s.createdAt));

    return res.json({
      totalSessions,
      totalMinutes,
      averageScore: Math.round(averageScore * 100) / 100,
      streakDays,
      recentSessions,
      topTopics,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting study progress");
    return res.status(500).json({ error: "Failed to get progress" });
  }
});

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const daySet = new Set(
    dates.map((d) => new Date(d).toISOString().slice(0, 10))
  );
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let current = new Date();
  while (true) {
    const key = current.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default router;
