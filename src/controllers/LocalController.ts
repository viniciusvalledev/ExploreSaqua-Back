import { Request, Response } from "express";
import LocalService from "../services/LocalService";
import fs from "fs/promises";
import path from "path";
import Local from "../entities/Local.entity";
import ContadorVisualizacao from "../entities/ContadorVisualizacao.entity";

class LocalController {
  private _deleteUploadedFilesOnFailure = async (req: Request) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files) return;
    const filesToDelete = Object.values(files).flat();
    await Promise.all(
      filesToDelete.map((file) =>
        fs
          .unlink(file.path)
          .catch((err) =>
            console.error(
              `Falha ao deletar arquivo ${file.path} durante rollback: ${err.message}`,
            ),
          ),
      ),
    );
  };

  private _handleError = (error: any, res: Response): Response => {
    // Tratamento genérico de erros do Sequelize
    if (
      error.name === "SequelizeDatabaseError" &&
      error.message.includes("Data too long for column")
    ) {
      return res.status(400).json({
        message: "Um dos campos excedeu o limite de caracteres permitido.",
      });
    }

    if (error.message.includes("não encontrado")) {
      return res.status(404).json({ message: error.message });
    }

    console.error("ERRO NÃO TRATADO:", error);
    return res
      .status(500)
      .json({ message: "Ocorreu um erro interno no servidor." });
  };

  private _moveFilesAndPrepareData = async (
    req: Request,
    existingInfo?: { categoria: string; nomeLocal: string },
  ): Promise<any> => {
    const dadosDoFormulario = req.body;
    const arquivos = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const categoria = existingInfo?.categoria || dadosDoFormulario.categoria;
    const nomeLocal =
      existingInfo?.nomeLocal ||
      dadosDoFormulario.nomeLocal ||
      dadosDoFormulario.nomeProjeto;

    const sanitize = (name: string) =>
      (name || "").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const safeCategoria = sanitize(categoria || "geral");
    const safenomeLocal = sanitize(nomeLocal || "local_sem_nome");

    const targetDir = path.resolve("uploads", safeCategoria, safenomeLocal);
    await fs.mkdir(targetDir, { recursive: true });

    const moveFile = async (
      file?: Express.Multer.File,
    ): Promise<string | undefined> => {
      if (!file) return undefined;
      const oldPath = file.path;
      const newPath = path.join(targetDir, file.filename);
      await fs.rename(oldPath, newPath);
      return path
        .join("uploads", safeCategoria, safenomeLocal, file.filename)
        .replace(/\\/g, "/");
    };

    // Processa os arquivos enviados pelo Front
    // Nota: Mesmo que o logo não seja salvo no Entity 'Local' (pois removeu logoUrl),
    // ainda movemos o arquivo para a pasta organizada.
    const logoPath = await moveFile(arquivos["logo"]?.[0]);
    const oficioPath = await moveFile(
      arquivos["oficio"]?.[0] || arquivos["ccmei"]?.[0],
    );

    // Galeria de imagens
    const galleryFiles = arquivos["imagens"] || arquivos["produtos"] || [];
    const produtosPaths: string[] = [];

    for (const file of galleryFiles) {
      const newPath = await moveFile(file);
      if (newPath) produtosPaths.push(newPath);
    }

    return {
      ...dadosDoFormulario,
      ...(logoPath && { logo: logoPath }), // Passa o logo, mas o Service ignora se não tiver campo
      ...(oficioPath && { oficio: oficioPath }),
      ...(produtosPaths.length > 0 && { produtos: produtosPaths }),
    };
  };

  public cadastrar = async (req: Request, res: Response): Promise<Response> => {
    try {
      const dadosCompletos = await this._moveFilesAndPrepareData(req);
      const novoLocal =
        await LocalService.cadastrarLocalComImagens(dadosCompletos);
      return res.status(201).json(novoLocal);
    } catch (error: any) {
      await this._deleteUploadedFilesOnFailure(req);
      return this._handleError(error, res);
    }
  };

  public solicitarAtualizacao = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const { localId } = req.body;

      if (!localId) {
        return res.status(400).json({
          message: "O ID do local (localId) é obrigatório.",
        });
      }

      const localExistente = await Local.findByPk(localId);

      if (!localExistente) {
        await this._deleteUploadedFilesOnFailure(req);
        return res.status(404).json({
          message: "Local não encontrado.",
        });
      }

      const dadosCompletos = await this._moveFilesAndPrepareData(req, {
        categoria: localExistente.categoria,
        nomeLocal: localExistente.nomeLocal,
      });

      const local = await LocalService.solicitarAtualizacao(
        localId,
        dadosCompletos,
      );

      return res.status(200).json({
        message: "Solicitação enviada.",
        local,
      });
    } catch (error: any) {
      await this._deleteUploadedFilesOnFailure(req);
      return this._handleError(error, res);
    }
  };

  public solicitarExclusao = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const { localId } = req.body;

      if (!localId) {
        return res.status(400).json({
          message: "O ID do local é obrigatório.",
        });
      }

      const localExistente = await Local.findByPk(localId);

      if (!localExistente) {
        await this._deleteUploadedFilesOnFailure(req);
        return res.status(404).json({
          message: "Local não encontrado.",
        });
      }

      const dadosCompletos = await this._moveFilesAndPrepareData(req, {
        categoria: localExistente.categoria,
        nomeLocal: localExistente.nomeLocal,
      });

      await LocalService.solicitarExclusao(localId, dadosCompletos);

      return res
        .status(200)
        .json({ message: "Solicitação de exclusão enviada." });
    } catch (error: any) {
      await this._deleteUploadedFilesOnFailure(req);
      return this._handleError(error, res);
    }
  };

  public listarTodos = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const locais = await LocalService.listarTodos();
      return res.status(200).json(locais);
    } catch (error: any) {
      return this._handleError(error, res);
    }
  };

  public buscarPorCategoria = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const { categoria } = req.params;
      const locais = await LocalService.buscarPorCategoria(categoria);
      return res.status(200).json(locais);
    } catch (error: any) {
      return this._handleError(error, res);
    }
  };

  public buscarPorNome = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const nome = (req.params.nome || req.query.nome) as string;
      const locais = await LocalService.buscarPorNome(nome);
      return res.status(200).json(locais);
    } catch (error: any) {
      return this._handleError(error, res);
    }
  };

  public buscarPorId = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      const local = await LocalService.buscarPorId(id);

      if (!local) {
        return res.status(404).json({
          message: "Local não encontrado.",
        });
      }
      return res.status(200).json(local);
    } catch (error: any) {
      return this._handleError(error, res);
    }
  };

  public alterarStatus = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      const { ativo } = req.body;
      if (typeof ativo !== "boolean") {
        return res.status(400).json({
          message: "O valor 'ativo' deve ser booleano.",
        });
      }
      const local = await LocalService.alterarStatusAtivo(id, ativo);
      return res.status(200).json(local);
    } catch (error: any) {
      return this._handleError(error, res);
    }
  };

  public registrarVisualizacao = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
    try {
      const { identificador } = req.params;
      if (!identificador)
        return res.status(400).json({ message: "ID obrigatório." });

      let chaveFormatada = identificador.trim().toUpperCase();
      if (!chaveFormatada.startsWith("CAT_") && chaveFormatada !== "HOME") {
        chaveFormatada = "CAT_" + chaveFormatada.replace(/[^A-Z0-9]/g, "_");
      }

      const [registro] = await ContadorVisualizacao.findOrCreate({
        where: { identificador: chaveFormatada },
        defaults: { visualizacoes: 0 },
      });

      await registro.increment("visualizacoes");
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ message: "Erro interno." });
    }
  };
}

export default new LocalController();
