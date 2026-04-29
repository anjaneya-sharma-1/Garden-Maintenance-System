import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import plantsRouter from "./plants";
import knowledgeRouter from "./knowledge";
import gardenRouter from "./garden";
import careRouter from "./care";
import remindersRouter from "./reminders";
import soilRouter from "./soil";
import wateringRouter from "./watering";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(plantsRouter);
router.use(knowledgeRouter);
router.use(gardenRouter);
router.use(careRouter);
router.use(remindersRouter);
router.use(soilRouter);
router.use(wateringRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
