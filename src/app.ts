import express from "express";
import cors from "cors";
import path from "path";
// O dotenv já é carregado no server.ts, mas não faz mal garantir aqui também,
// desde que aponte para o lugar certo (mesma pasta).
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env") });

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import avaliacaoRoutes from "./routes/avaliacao.routes";
import localRoutes from "./routes/local.routes";
import fileRoutes from "./routes/file.routes";
import adminRoutes from "./routes/admin.routes";
import { authMiddleware } from "./middlewares/auth.middleware";
import LocalController from "./controllers/LocalController";
import router from "./routes/admin.routes";

const app = express();

// Ajuste para pegar a pasta uploads na raiz do projeto
const uploadsPath = path.resolve(__dirname, "uploads");

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve os arquivos estáticos (imagens)
app.use("/uploads", express.static(uploadsPath));

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/locais", localRoutes);
router.get("/categoria/:categoria", LocalController.buscarPorCategoria);
app.use("/api/avaliacoes", avaliacaoRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/admin", adminRoutes);

// Rotas protegidas
app.use("/api/users", authMiddleware, userRoutes);

export default app;
