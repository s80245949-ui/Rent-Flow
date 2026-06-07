import { Router, type IRouter } from "express";
import healthRouter from "./health";
import propertiesRouter from "./properties";
import tenantsRouter from "./tenants";
import invoicesRouter from "./invoices";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import resetRouter from "./reset";

const router: IRouter = Router();

router.use(healthRouter);
router.use(propertiesRouter);
router.use(tenantsRouter);
router.use(invoicesRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);
router.use(resetRouter);

export default router;
