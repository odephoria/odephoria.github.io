import { Router } from "express";
import { db } from "@workspace/db";
import { studySpacesTable, conversations } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/study/spaces", async (req, res) => {
  try {
    const spaces = await db
      .select()
      .from(studySpacesTable)
      .orderBy(desc(studySpacesTable.updatedAt));
    return res.json(spaces);
  } catch (err) {
    req.log.error({ err }, "Error listing spaces");
    return res.status(500).json({ error: "Failed to list spaces" });
  }
});

router.post("/study/spaces", async (req, res) => {
  try {
    const { name, description, materialText, youtubeUrl } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const [conv] = await db
      .insert(conversations)
      .values({ title: name })
      .returning();

    const [space] = await db
      .insert(studySpacesTable)
      .values({ name, description, materialText, youtubeUrl, conversationId: conv.id })
      .returning();

    return res.status(201).json(space);
  } catch (err) {
    req.log.error({ err }, "Error creating space");
    return res.status(500).json({ error: "Failed to create space" });
  }
});

router.get("/study/spaces/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [space] = await db
      .select()
      .from(studySpacesTable)
      .where(eq(studySpacesTable.id, id));
    if (!space) return res.status(404).json({ error: "Not found" });
    return res.json(space);
  } catch (err) {
    req.log.error({ err }, "Error getting space");
    return res.status(500).json({ error: "Failed to get space" });
  }
});

router.patch("/study/spaces/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, materialText, youtubeUrl, lastVisitedPage } = req.body;
    const [updated] = await db
      .update(studySpacesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(materialText !== undefined && { materialText }),
        ...(youtubeUrl !== undefined && { youtubeUrl }),
        ...(lastVisitedPage !== undefined && { lastVisitedPage }),
        updatedAt: new Date(),
      })
      .where(eq(studySpacesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating space");
    return res.status(500).json({ error: "Failed to update space" });
  }
});

router.delete("/study/spaces/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db
      .delete(studySpacesTable)
      .where(eq(studySpacesTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting space");
    return res.status(500).json({ error: "Failed to delete space" });
  }
});

export default router;
