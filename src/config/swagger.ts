import path from "path";
import fs from "fs";
import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "ExploreSaqua API",
    version: "1.0.0",
    description: "Documentação da API ExploreSaqua",
  },
  servers: [
    {
      url: process.env.APP_URL || "http://localhost:3000",
      description: "Servidor",
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  // Procura por anotações JSDoc nas rotas e controllers
  apis: [
    path.resolve(__dirname, "../routes/*.ts"),
    path.resolve(__dirname, "../controllers/*.ts"),
  ],
};

const swaggerSpec = swaggerJSDoc(options) as any;

// Se o developer não adicionou JSDoc, podemos tentar gerar paths básicos a partir das rotas
// para exibir *todas* as APIs na UI. Isso cria operações mínimas (summary, tags, parâmetros de path).
try {
  const routesDir = path.resolve(__dirname, "../routes");
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".ts"));

  // Mapeamento dos arquivos de rota para o prefixo usado em app.ts
  const prefixMap: Record<string, string> = {
    "auth.routes.ts": "/api/auth",
    "local.routes.ts": "/api/locais",
    "avaliacao.routes.ts": "/api/avaliacoes",
    "file.routes.ts": "/api/files",
    "admin.routes.ts": "/api/admin",
    "user.routes.ts": "/api/users",
  };

  swaggerSpec.paths = swaggerSpec.paths || {};

  const methodRegex = /router\.(get|post|put|delete|patch)\s*\(\s*[`'"]([^"'`]+)[`'"]/g;

  files.forEach((file) => {
    const full = path.join(routesDir, file);
    const content = fs.readFileSync(full, "utf8");
    const prefix = prefixMap[file] || "";

    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      let routePath = match[2];

      // Normaliza '/' duplicados
      if (!routePath.startsWith("/")) routePath = "/" + routePath;

      // Concatena prefix e rota
      let fullPath = (prefix + routePath).replace(/\/\/+/g, "/");

      // Converte :param -> {param} para OpenAPI
      const paramNames: string[] = [];
      fullPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, (_m, p1) => {
        paramNames.push(p1);
        return `{${p1}}`;
      });

      swaggerSpec.paths[fullPath] = swaggerSpec.paths[fullPath] || {};

      // Se já existir uma operação criada por JSDoc, não sobrescreve
      if (swaggerSpec.paths[fullPath][method]) continue;

      const parameters = paramNames.map((name) => ({
        name,
        in: "path",
        required: true,
        schema: { type: "string" },
      }));

      swaggerSpec.paths[fullPath][method] = {
        tags: [file.replace(".ts", "")],
        summary: `Auto-generated: ${method.toUpperCase()} ${fullPath}`,
        responses: {
          "200": {
            description: "Success",
          },
        },
        parameters: parameters.length ? parameters : undefined,
      };
    }
  });
} catch (err) {
  // se falhar, apenas não adicionamos os paths extras
  console.warn("Swagger auto-route generation failed:", err);
}

export default swaggerSpec;
