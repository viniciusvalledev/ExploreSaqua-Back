import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { adminAuthMiddleware } from "../middlewares/adminAuth.middleware";
import multer from "multer";


const router = Router();
const upload = multer();

router.post("/login", 
  AdminController.login
);

router.get("/pending", 
  adminAuthMiddleware, 
  AdminController.getPending
);
router.post(
  "/approve/:id",
  adminAuthMiddleware,
  AdminController.approveRequest
);
router.post(
  "/edit-and-approve/:id",
  adminAuthMiddleware,
  upload.any(),
  AdminController.editAndApproveRequest
);
router.post(
  "/reject/:id",
  adminAuthMiddleware,
  AdminController.rejectRequest
);

router.get(
  "/locais-ativos",
  adminAuthMiddleware,
  AdminController.getAllActiveLocal
);
router.get(
  "/locais-inativos",
  adminAuthMiddleware,
  AdminController.getInactiveLocals
);

router.patch(
  "/local/:id",
  adminAuthMiddleware,
  upload.any(),
  AdminController.adminUpdateLocal
);

router.delete(
  "/local/:id",
  adminAuthMiddleware,
  AdminController.deleteLocal
);

router.patch(
  "/local/:id/ativo",
  adminAuthMiddleware,
  AdminController.toggleLocalAtivo
);

router.get(
  "/avaliacoes/local/:localId",
  adminAuthMiddleware,
  AdminController.getAvaliacoesByLocal
);

// Rota para admin excluir uma avaliação
router.delete(
  "/avaliacoes/:id",
  adminAuthMiddleware,
  AdminController.adminDeleteAvaliacao
);
router.get(
  "/exportar-locais",
  adminAuthMiddleware,
  AdminController.exportActiveLocals
);

router.get(
  "/dashboard-stats",
  adminAuthMiddleware,
  AdminController.getDashboardStats
);


export default router;
