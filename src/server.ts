// src/server.ts - VERSÃO CORRIGIDA PARA .env.local

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

console.log("Servindo uploads em:", path.resolve(__dirname, "..", "uploads"));
import app from "./app";
import sequelize from "./config/database";

const PORT = process.env.PORT || 3306;

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Conexão com a base de dados estabelecida com sucesso (authenticate).");

    await sequelize.sync({ alter: true });
    console.log("✅ Banco de dados sincronizado (sequelize.sync alter: true)");

    app.listen(PORT, () => {
      const docsUrl = `http://localhost:${PORT}/docs`;
      console.log(`🚀 Servidor a rodar na porta ${PORT}`);
      console.log(`✅ A sua API está pronta! Pode aceder em http://localhost:${PORT}`);
      console.log(`📘 Swagger UI: ${docsUrl} `);
    });
  } catch (err) {
    console.error("❌ Não foi possível conectar ou sincronizar a base de dados:", err);
    process.exit(1);
  }
})();
