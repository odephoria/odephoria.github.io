import { Router, type IRouter } from "express";
import healthRouter from "./health";
import anthropicRouter from "./anthropic";
import studyRouter from "./study";

const router: IRouter = Router();

router.use(healthRouter);
router.use(anthropicRouter);
router.use(studyRouter);

export default router;
