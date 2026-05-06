import { Router, type IRouter } from "express";
import healthRouter from "./health";
import anthropicRouter from "./anthropic";
import studyRouter from "./study";
import spacesRouter from "./spaces";

const router: IRouter = Router();

router.use(healthRouter);
router.use(anthropicRouter);
router.use(studyRouter);
router.use(spacesRouter);

export default router;
