import { Request, Response } from "express";
import Local, { StatusLocal } from "../entities/Local.entity";
import * as jwt from "jsonwebtoken";
import ImagemLocal from "../entities/ImagemLocal.entity";
import sequelize from "../config/database";
import fs from "fs/promises";
import path from "path";
import EmailService from "../utils/EmailService";
import LocalService from "../services/LocalService";
import Avaliacao from "../entities/Avaliacao.entity";
import Usuario from "../entities/Usuario.entity";
import ContadorVisualizacao from "../entities/ContadorVisualizacao.entity";

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!ADMIN_USER || !ADMIN_PASSWORD || !JWT_SECRET) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("ERRO CRÍTICO: Variáveis de ambiente do Admin não definidas.");
  console.error(
    "Por favor, defina ADMIN_USER, ADMIN_PASSWORD, e ADMIN_JWT_SECRET"
  );
  console.error(
    "no seu ficheiro .env (ou .env.local) antes de iniciar o servidor."
  );
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  throw new Error(
    "Credenciais de administrador ou segredo JWT não configurados."
  );
}

export class AdminController {
  static async login(req: Request, res: Response) {
    const { username, password } = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { username, role: "admin" },
        JWT_SECRET as string,
        {
          expiresIn: "8h",
        }
      );
      return res.json({ success: true, token });
    }

    return res
      .status(401)
      .json({ success: false, message: "Credenciais inválidas" });
  }

  static async getPending(req: Request, res: Response) {
    try {
      const includeOptions = {
        model: ImagemLocal,
        as: "produtosImg",
        attributes: ["url"],
      };

      const cadastros = await Local.findAll({
        where: { status: StatusLocal.PENDENTE_APROVACAO },
        include: [includeOptions],
      });
      const atualizacoes = await Local.findAll({
        where: { status: StatusLocal.PENDENTE_ATUALIZACAO },
        include: [includeOptions],
      });
      const exclusoes = await Local.findAll({
        where: { status: StatusLocal.PENDENTE_EXCLUSAO },
        include: [includeOptions],
      });

      return res.json({ cadastros, atualizacoes, exclusoes });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Erro ao buscar solicitações pendentes." });
    }
  }

  static async approveRequest(req: Request, res: Response) {
    const { id } = req.params;
    const transaction = await sequelize.transaction();

    try {
      let responseMessage = "Solicitação aprovada com sucesso.";

      const local = await Local.findByPk(id, {
        transaction,
        include: [{ model: ImagemLocal, as: "produtosImg" }],
      });
      
      if (!local) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ message: "local não encontrado." });
      }
      
      let emailInfo: { subject: string; html: string } | null = null;

      switch (local.status) {
        case StatusLocal.PENDENTE_APROVACAO:
          local.status = StatusLocal.ATIVO;
          local.ativo = true;
          await local.save({ transaction });

          emailInfo = {
            subject: "Seu cadastro no MeideSaquá foi Aprovado!",
            html: `
              <h1>Olá, ${local.nomeResponsavel}!</h1>
              <p>Temos uma ótima notícia: o seu local, <strong>${local.nomeLocal}</strong>, foi aprovado e já está visível na nossa plataforma!</p>
              <p>A partir de agora, clientes podem encontrar o seu negócio e deixar avaliações.</p>
              <p>Agradecemos por fazer parte da comunidade de empreendedores de Saquarema.</p>
              <br>
              <p>Atenciosamente,</p>
              <p><strong>Equipe MeideSaquá.</strong></p>
            `,
          };
          break;

        case StatusLocal.PENDENTE_ATUALIZACAO:
          if (local.dados_atualizacao) {
            const dadosRecebidos = local.dados_atualizacao as any;
            const dadosParaAtualizar: Partial<Local> & {
              [key: string]: any;
            } = {};

            const camposPermitidos: (keyof Local | string)[] = [
              "categoria",
              "contatoLocal",
              "nomeLocal",
              "endereco",
              "descricao",
              "instagram",
              "nomeResponsavel",
              "cpfResponsavel",
              "latitude",
              "longitude",
            ];

            for (const key of camposPermitidos) {
              if (
                dadosRecebidos.hasOwnProperty(key) &&
                dadosRecebidos[key] != null
              ) {
                (dadosParaAtualizar as any)[key] = dadosRecebidos[key];
              }
            }

            // --- LÓGICA DA LOGO RESTAURADA ---
            if (dadosRecebidos.logo) {
              const logoAntigaUrl = (local as any).logoUrl || (local as any).logo;
              if (logoAntigaUrl) {
                try {
                  const filePath = path.join(
                    __dirname,
                    "..",
                    "..",
                    logoAntigaUrl
                  );
                  await fs.unlink(filePath);
                } catch (err) {
                  console.error(
                    `AVISO: Falha ao deletar logo antiga: ${logoAntigaUrl}`,
                    err
                  );
                }
              }
              dadosParaAtualizar.logoUrl = dadosRecebidos.logo;
            }
            // --- FIM LOGICA LOGO ---

            // Lógica de imagens (Produtos/Portfólio) mantida
            if (
              dadosRecebidos.produtos &&
              Array.isArray(dadosRecebidos.produtos) &&
              dadosRecebidos.produtos.length > 0
            ) {
              const imagensAntigas = await ImagemLocal.findAll({
                where: { localId: local.localId },
                transaction,
              });

              for (const imagem of imagensAntigas) {
                try {
                  const filePath = path.join(__dirname, "..", "..", imagem.url);
                  await fs.unlink(filePath);
                } catch (err) {
                  console.error(
                    `AVISO: Falha ao deletar imagem antiga: ${imagem.url}`,
                    err
                  );
                }
              }

              await ImagemLocal.destroy({
                where: { localId: local.localId },
                transaction,
              });

              const novasImagens = dadosRecebidos.produtos.map(
                (url: string) => ({
                  url,
                  localId: local.localId,
                })
              );
              await ImagemLocal.bulkCreate(novasImagens, { transaction });
            }

            dadosParaAtualizar.dados_atualizacao = null;
            dadosParaAtualizar.status = StatusLocal.ATIVO;
            dadosParaAtualizar.ativo = true;

            await local.update(dadosParaAtualizar, { transaction });
          } else {
            local.dados_atualizacao = null;
            local.status = StatusLocal.ATIVO;
            local.ativo = true;
            await local.save({ transaction });
          }

          emailInfo = {
            subject:
              "Sua solicitação de atualização no MeideSaquá foi Aprovada!",
            html: `
              <h1>Olá, ${local.nomeResponsavel}!</h1>
              <p>A sua solicitação para atualizar os dados do local <strong>${local.nomeLocal}</strong> foi aprovada.</p>
              <p>As novas informações já estão visíveis para todos na plataforma.</p>
              <br>
              <p>Atenciosamente,</p>
              <p><strong>Equipe MeideSaquá</strong></p>
            `,
          };
          break;

        case StatusLocal.PENDENTE_EXCLUSAO:
          // TODO: Adicionar lógica para deletar arquivos (logo, imagens) ANTES do destroy
          emailInfo = {
            subject: "Seu local foi removido da plataforma MeideSaquá",
            html: `
              <h1>Olá, ${local.nomeResponsavel}.</h1>
              <p>Informamos que a sua solicitação para remover o local <strong>${local.nomeLocal}</strong> da nossa plataforma foi concluída com sucesso.</p>
              <p>Lamentamos a sua partida e esperamos poder colaborar com você novamente no futuro.</p>
              <br>
              <p>Atenciosamente,</p>
              <p><strong>Equipe MeideSaquá</strong></p>
            `,
          };
          await local.destroy({ transaction });
          responseMessage = "local excluído com sucesso.";
          break;
      }

      await transaction.commit();

      if (emailInfo && local.contatoLocal) {
        try {
          await EmailService.sendGenericEmail({
            to: local.contatoLocal,
            subject: emailInfo.subject,
            html: emailInfo.html,
          });
          console.log(
            `Email de notificação enviado com sucesso para ${local.contatoLocal}`
          );
        } catch (error) {
          console.error(
            `Falha ao enviar email de notificação para ${local.contatoLocal}:`,
            error
          );
        }
      } else if (emailInfo) {
        console.warn(
          `Tentativa de enviar email para local ID ${local.localId} sem contatoLocal definido.`
        );
      }

      return res.status(200).json({ message: responseMessage });
    } catch (error) {
      await transaction.rollback();
      console.error("ERRO DURANTE A APROVAÇÃO:", error);
      return res
        .status(500)
        .json({ message: "Erro ao aprovar a solicitação." });
    }
  }

  static async editAndApproveRequest(req: Request, res: Response) {
    const { id } = req.params;
    const adminEditedData = req.body;

    let { urlsParaExcluir } = adminEditedData;
    if (urlsParaExcluir && typeof urlsParaExcluir === "string") {
      try {
        urlsParaExcluir = JSON.parse(urlsParaExcluir);
      } catch (e) {
        console.error(
          "Falha ao parsear urlsParaExcluir em editAndApproveRequest:",
          e
        );
        urlsParaExcluir = [];
      }
    }

    const transaction = await sequelize.transaction();

    try {
      const local = await Local.findByPk(id, {
        transaction,
        include: [{ model: ImagemLocal, as: "produtosImg" }],
      });

      if (!local) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ message: "Local não encontrado." });
      }

      let emailInfo: { subject: string; html: string } | null = null;
      const statusOriginal = local.status;
      const dadosRecebidos = (local.dados_atualizacao || {}) as any;

      if (
        statusOriginal === StatusLocal.PENDENTE_ATUALIZACAO &&
        local.dados_atualizacao
      ) {
        
        // --- LÓGICA DA LOGO RESTAURADA ---
        if (
          "logoUrl" in adminEditedData &&
          adminEditedData.logoUrl === "DELETE"
        ) {
          const logoAntigaUrl = (local as any).logoUrl || dadosRecebidos.logo;
          if (logoAntigaUrl) {
            try {
              const filePath = path.join(__dirname, "..", "..", logoAntigaUrl);
              await fs.unlink(filePath);
            } catch (err) {
              console.error(
                `AVISO: Falha ao deletar logo: ${logoAntigaUrl}`,
                err
              );
            }
          }
          adminEditedData.logoUrl = null;
        }
        else if (dadosRecebidos.logo) {
          const logoAntigaUrl = (local as any).logoUrl;
          if (logoAntigaUrl) {
            try {
              const filePath = path.join(__dirname, "..", "..", logoAntigaUrl);
              await fs.unlink(filePath);
            } catch (err) {
              console.error(
                `AVISO: Falha ao deletar logo antiga: ${logoAntigaUrl}`,
                err
              );
            }
          }
          adminEditedData.logoUrl = dadosRecebidos.logo;
        }
        // --- FIM LÓGICA LOGO ---

        // Lógica para IMAGENS
        if (
          dadosRecebidos.imagens &&
          Array.isArray(dadosRecebidos.imagens) &&
          dadosRecebidos.imagens.length > 0
        ) {
          const imagensAntigas = await ImagemLocal.findAll({
            where: { localId: local.localId },
            transaction,
          });

          for (const imagem of imagensAntigas) {
            try {
              const filePath = path.join(__dirname, "..", "..", imagem.url);
              await fs.unlink(filePath);
            } catch (err) {
              // ignora
            }
          }

          await ImagemLocal.destroy({
            where: { localId: local.localId },
            transaction,
          });

          const imagensParaCriar = dadosRecebidos.imagens.filter(
            (url: string) => !(urlsParaExcluir && urlsParaExcluir.includes(url))
          );

          const novasImagens = imagensParaCriar.map((url: string) => ({
            url,
            localId: local.localId,
          }));
          await ImagemLocal.bulkCreate(novasImagens, { transaction });
        } else if (
          urlsParaExcluir &&
          Array.isArray(urlsParaExcluir) &&
          urlsParaExcluir.length > 0
        ) {
          const imagensParaDeletar = await ImagemLocal.findAll({
            where: {
              url: urlsParaExcluir,
              localId: local.localId,
            },
            transaction,
          });

          for (const imagem of imagensParaDeletar) {
            try {
              const filePath = path.join(__dirname, "..", "..", imagem.url);
              await fs.unlink(filePath);
            } catch (err) {
              // ignora
            }
          }

          await ImagemLocal.destroy({
            where: {
              id: imagensParaDeletar.map((img) => img.id),
            },
            transaction,
          });
        }
      }

      delete adminEditedData.urlsParaExcluir;

      await local.update(
        {
          ...adminEditedData,
          status: StatusLocal.ATIVO,
          ativo: true,
          dados_atualizacao: null,
        },
        { transaction }
      );

      if (statusOriginal === StatusLocal.PENDENTE_APROVACAO) {
        emailInfo = {
          subject: "Seu cadastro no MeideSaquá foi Aprovado!",
          html: `<h1>Olá, ${local.nomeResponsavel}!</h1> <p>Temos uma ótima notícia: o seu local, <strong>${local.nomeLocal}</strong>, foi aprovado (com algumas edições do administrador) e já está visível na nossa plataforma!</p><p>Agradecemos por fazer parte da comunidade de empreendedores de Saquarema.</p><br><p>Atenciosamente,</p><p><strong>Equipe MeideSaquá.</strong></p>`,
        };
      } else if (
        statusOriginal === StatusLocal.PENDENTE_ATUALIZACAO
      ) {
        emailInfo = {
          subject: "Sua solicitação de atualização no MeideSaquá foi Aprovada!",
          html: `<h1>Olá, ${local.nomeResponsavel}!</h1><p>A sua solicitação para atualizar os dados do local <strong>${local.nomeLocal}</strong> foi aprovada (com algumas edições do administrador).</p><p>As novas informações já estão visíveis para todos na plataforma.</p><br><p>Atenciosamente,</p><p><strong>Equipe MeideSaquá</strong></p>`,
        };
      }

      await transaction.commit();

      if (emailInfo && local.contatoLocal) {
        try {
          await EmailService.sendGenericEmail({
            to: local.contatoLocal,
            subject: emailInfo.subject,
            html: emailInfo.html,
          });
        } catch (error) {
          console.error(
            `Falha ao enviar email de notificação para ${local.contatoLocal}:`,
            error
          );
        }
      }

      return res
        .status(200)
        .json({ message: "Local editado e aprovado com sucesso." });
    } catch (error) {
      await transaction.rollback();
      console.error("ERRO DURANTE A EDIÇÃO E APROVAÇÃO:", error);
      return res
        .status(500)
        .json({ message: "Erro ao editar e aprovar a solicitação." });
    }
  }

  static async getAllActiveLocal(req: Request, res: Response) {
    try {
      const local = await LocalService.listarTodos();
      return res.json(local);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Erro ao buscar local ativos." });
    }
  }

  static async adminUpdateLocal(req: Request, res: Response) {
    const { id } = req.params;
    const adminEditedData = req.body;

    let { urlsParaExcluir } = adminEditedData;
    if (urlsParaExcluir && typeof urlsParaExcluir === "string") {
      try {
        urlsParaExcluir = JSON.parse(urlsParaExcluir);
      } catch (e) {
        console.error(
          "Falha ao parsear urlsParaExcluir em adminUpdateLocal:",
          e
        );
        urlsParaExcluir = [];
      }
    }

    const transaction = await sequelize.transaction();

    try {
      const local = await Local.findByPk(id, {
        transaction,
        include: [{ model: ImagemLocal, as: "produtosImg" }],
      });

      if (!local) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ message: "Local não encontrado." });
      }

      const statusOriginal = local.status;
      const dadosRecebidos = (local.dados_atualizacao || {}) as any;
      let emailInfo: { subject: string; html: string } | null = null;

      // --- LÓGICA DA LOGO RESTAURADA ---
      if (
        "logoUrl" in adminEditedData &&
        (adminEditedData.logoUrl === "DELETE" ||
          adminEditedData.logoUrl === null)
      ) {
        const logoAntigaUrl = (local as any).logoUrl || dadosRecebidos.logo;
        if (logoAntigaUrl) {
          try {
            const filePath = path.join(__dirname, "..", "..", logoAntigaUrl);
            await fs.unlink(filePath);
            console.log(`Logo deletada: ${logoAntigaUrl}`);
          } catch (err) {
            console.error(
              `AVISO: Falha ao deletar logo: ${logoAntigaUrl}`,
              err
            );
          }
        }
        adminEditedData.logoUrl = null;
      } else if (
        (statusOriginal === StatusLocal.PENDENTE_ATUALIZACAO ||
          statusOriginal === StatusLocal.PENDENTE_APROVACAO) &&
        dadosRecebidos.logo
      ) {
        const logoAntigaUrl = (local as any).logoUrl;
        if (logoAntigaUrl) {
          try {
            const filePath = path.join(__dirname, "..", "..", logoAntigaUrl);
            await fs.unlink(filePath);
          } catch (err) {
            console.error(
              `AVISO: Falha ao deletar logo antiga: ${logoAntigaUrl}`,
              err
            );
          }
        }
        adminEditedData.logoUrl = dadosRecebidos.logo;
      }
      // --- FIM LÓGICA LOGO ---

      // 1. LÓGICA DE IMAGENS DO PORTFÓLIO
      if (
        (statusOriginal === StatusLocal.PENDENTE_ATUALIZACAO ||
          statusOriginal === StatusLocal.PENDENTE_APROVACAO) &&
        dadosRecebidos.imagens &&
        Array.isArray(dadosRecebidos.imagens) &&
        dadosRecebidos.imagens.length > 0
      ) {
        const imagensAntigas = await ImagemLocal.findAll({
          where: { localId: local.localId },
          transaction,
        });

        for (const imagem of imagensAntigas) {
          try {
            const filePath = path.join(__dirname, "..", "..", imagem.url);
            await fs.unlink(filePath);
          } catch (err) {
            // ignora
          }
        }

        await ImagemLocal.destroy({
          where: { localId: local.localId },
          transaction,
        });

        const imagensParaCriar = dadosRecebidos.imagens.filter(
          (url: string) => !(urlsParaExcluir && urlsParaExcluir.includes(url))
        );

        const novasImagens = imagensParaCriar.map((url: string) => ({
          url,
          localId: local.localId,
        }));
        await ImagemLocal.bulkCreate(novasImagens, { transaction });
      } else if (
        urlsParaExcluir &&
        Array.isArray(urlsParaExcluir) &&
        urlsParaExcluir.length > 0
      ) {
        const imagensParaDeletar = await ImagemLocal.findAll({
          where: {
            url: urlsParaExcluir,
            localId: local.localId,
          },
          transaction,
        });

        for (const imagem of imagensParaDeletar) {
          try {
            const filePath = path.join(__dirname, "..", "..", imagem.url);
            await fs.unlink(filePath);
            console.log(`Imagem de portfólio deletada: ${imagem.url}`);
          } catch (err) {
            console.error(
              `AVISO: Falha ao deletar imagem de portfólio: ${imagem.url}`,
              err
            );
          }
        }

        await ImagemLocal.destroy({
          where: { id: imagensParaDeletar.map((img) => img.id) },
          transaction,
        });
      }

      const updatePayload: any = {
        ...adminEditedData,
      };

      if (
        statusOriginal === StatusLocal.PENDENTE_APROVACAO ||
        statusOriginal === StatusLocal.PENDENTE_ATUALIZACAO
      ) {
        updatePayload.status = StatusLocal.ATIVO;
        updatePayload.ativo = true;
        updatePayload.dados_atualizacao = null;

        if (statusOriginal === StatusLocal.PENDENTE_APROVACAO) {
          emailInfo = {
            subject: "Seu cadastro no MeideSaquá foi Aprovado!",
            html: `<h1>Olá, ${local.nomeResponsavel}!</h1> <p>Temos uma ótima notícia: o seu local, <strong>${local.nomeLocal}</strong>, foi aprovado (com algumas edições do administrador) e já está visível na nossa plataforma!</p><p>Agradecemos por fazer parte da comunidade de empreendedores de Saquarema.</p><br><p>Atenciosamente,</p><p><strong>Equipe MeideSaquá.</strong></p>`,
          };
        } else {
          emailInfo = {
            subject:
              "Sua solicitação de atualização no MeideSaquá foi Aprovada!",
            html: `<h1>Olá, ${local.nomeResponsavel}!</h1><p>A sua solicitação para atualizar os dados do local <strong>${local.nomeLocal}</strong> foi aprovada (com algumas edições do administrador).</p><p>As novas informações já estão visíveis para todos na plataforma.</p><br><p>Atenciosamente,</p><p><strong>Equipe MeideSaquá</strong></p>`,
          };
        }
      }

      delete updatePayload.localId;
      delete updatePayload.urlsParaExcluir;
      
      if ("dados_atualizacao" in updatePayload) {
        updatePayload.dados_atualizacao = null;
      }

      await local.update(updatePayload, { transaction });
      await transaction.commit();

      if (emailInfo && local.contatoLocal) {
        try {
          await EmailService.sendGenericEmail({
            to: local.contatoLocal,
            subject: emailInfo.subject,
            html: emailInfo.html,
          });
          console.log(
            `Email de aprovação/atualização enviado para ${local.contatoLocal}`
          );
        } catch (error) {
          console.error(
            `Falha ao enviar email de notificação para ${local.contatoLocal}:`,
            error
          );
        }
      }

      return res
        .status(200)
        .json({ message: "Local atualizado com sucesso." });
    } catch (error) {
      await transaction.rollback();
      console.error("ERRO DURANTE A ATUALIZAÇÃO ADMIN (UNIFICADA):", error);
      return res
        .status(500)
        .json({ message: "Erro ao atualizar o local." });
    }
  }

  static adminDeleteLocal = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res
          .status(400)
          .json({ message: "ID do local inválido." });
      }

      const local = await Local.findByPk(id);
      if (!local) {
        return res
          .status(404)
          .json({ message: "Local não encontrado." });
      }

      // TODO: Adicionar lógica para deletar arquivos (logo, imagens) ANTES do destroy
      await local.destroy();

      return res.status(204).send();
    } catch (error: any) {
      console.error("Falha ao excluir local (admin):", error);
      return res
        .status(500)
        .json({ message: "Erro interno ao excluir local." });
    }
  };

  static async rejectRequest(req: Request, res: Response) {
    const { id } = req.params;
    const { motivoRejeicao } = req.body;
    const transaction = await sequelize.transaction();
    try {
      const local = await Local.findByPk(id, {
        transaction,
      });
      if (!local) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ message: "Local não encontrado." });
      }

      let responseMessage = "Solicitação rejeitada com sucesso.";
      let emailInfo: { subject: string; html: string } | null = null;
      const emailParaNotificar = local.contatoLocal; // Usando o contato como via principal
      const motivoHtml = motivoRejeicao
        ? `<p><strong>Motivo da Rejeição:</strong> ${motivoRejeicao}</p>`
        : "<p>Para mais detalhes, entre em contato conosco.</p>";

      if (local.status === StatusLocal.PENDENTE_APROVACAO) {
        // TODO: Adicionar lógica para deletar arquivos (logo, imagens)
        await local.destroy({ transaction });
        responseMessage = "Cadastro de local rejeitado e removido.";

        emailInfo = {
          subject: "Seu cadastro no MeideSaquá foi Rejeitado",
          html: `<h1>Olá, ${local.nomeResponsavel}.</h1><p>Lamentamos informar que o cadastro do local <strong>${local.nomeLocal}</strong> não foi aprovado.</p>${motivoHtml}<br><p>Atenciosamente,</p><p><strong>Equipe MeideSaquá</strong></p>`,
        };
      } else if (
        local.status === StatusLocal.PENDENTE_ATUALIZACAO ||
        local.status === StatusLocal.PENDENTE_EXCLUSAO
      ) {
        const statusAnterior = local.status;
        local.status = StatusLocal.ATIVO;
        local.dados_atualizacao = null;
        await local.save({ transaction });

        // TODO: Adicionar lógica para deletar arquivos pendentes de atualização
        if (statusAnterior === StatusLocal.PENDENTE_ATUALIZACAO) {
          emailInfo = {
            subject:
              "Sua solicitação de atualização no MeideSaquá foi Rejeitada",
            html: `<h1>Olá, ${local.nomeResponsavel}.</h1><p>Informamos que a sua solicitação para atualizar os dados do local <strong>${local.nomeLocal}</strong> não foi aprovada.</p><p>Os dados anteriores foram mantidos.</p>${motivoHtml}<br><p>Atenciosamente,</p><p><strong>Equipe MeideSaquá</strong></p>`,
          };
        } else {
          emailInfo = {
            subject: "Sua solicitação de exclusão no MeideSaquá foi Rejeitada",
            html: `<h1>Olá, ${local.nomeResponsavel}.</h1><p>Informamos que a sua solicitação para remover o local <strong>${local.nomeLocal}</strong> não foi aprovada.</p><p>Seu local continua ativo na plataforma.</p>${motivoHtml}<br><p>Atenciosamente,</p><p><strong>Equipe MeideSaquá</strong></p>`,
          };
        }
      } else {
        await transaction.rollback();
        return res.status(400).json({
          message:
            "O local não está em um estado pendente para rejeição.",
        });
      }

      await transaction.commit();

      if (emailInfo && emailParaNotificar) {
        try {
          await EmailService.sendGenericEmail({
            to: emailParaNotificar,
            subject: emailInfo.subject,
            html: emailInfo.html,
          });
          console.log(
            `Email de rejeição enviado com sucesso para ${emailParaNotificar}`
          );
        } catch (error) {
          console.error(
            `Falha ao enviar email de rejeição para ${emailParaNotificar}:`,
            error
          );
        }
      }

      return res.status(200).json({ message: responseMessage });
    } catch (error) {
      await transaction.rollback();
      console.error("Erro ao rejeitar a solicitação:", error);
      return res
        .status(500)
        .json({ message: "Erro ao rejeitar a solicitação." });
    }
  }

  static async getAvaliacoesByLocal(req: Request, res: Response) {
    try {
      const { localId } = req.params;

      const local = await Local.findByPk(
        localId,
        {
          attributes: ["localId", "nomeLocal", "categoria"], 
        }
      );

      if (!local) {
        return res
          .status(404)
          .json({ message: "Local não encontrado." });
      }

      const avaliacoes = await Avaliacao.findAll({
        where: { LocalId: localId, parent_id: null },
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["usuarioId", "nomeCompleto", "email"],
          },
          {
            model: Avaliacao,
            as: "respostas",
            required: false,
            include: [
              {
                model: Usuario,
                as: "usuario",
                attributes: ["usuarioId", "nomeCompleto", "email"],
              },
            ],
          },
        ],
        order: [
          ["avaliacoesId", "DESC"],
          [{ model: Avaliacao, as: "respostas" }, "avaliacoesId", "ASC"],
        ],
      });

      return res.json({ local, avaliacoes });
    } catch (error) {
      console.error(
        "Erro ao buscar avaliações por local (admin):",
        error
      );
      return res.status(500).json({ message: "Erro ao buscar avaliações." });
    }
  }

  static async adminDeleteAvaliacao(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const avaliacao = await Avaliacao.findByPk(id);

      if (!avaliacao) {
        return res.status(404).json({ message: "Avaliação não encontrada." });
      }

      await avaliacao.destroy();

      return res
        .status(200)
        .json({ message: "Avaliação excluída com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir avaliação (admin):", error);
      return res.status(500).json({ message: "Erro ao excluir a avaliação." });
    }
  }

  static async exportActiveLocals(req: Request, res: Response) {
    try {
      const Locals = await LocalService.listarTodos();

      if (!Locals || Locals.length === 0) {
        return res
          .status(404)
          .json({ message: "Nenhum local ativo para exportar." });
      }

      // Cabeçalhos do CSV atualizados com os novos dados
      const headers = [
        "ID",
        "Nome Local",
        "Categoria",
        "Responsável",
        "CPF Responsável",
        "Contato",
        "Endereço",
        "Descrição",
        "Instagram",
        "Latitude",
        "Longitude",
        "Status",
      ];

      const SEPARATOR = ";";

      const escapeCsvField = (field: any) => {
        if (field === null || field === undefined) return '""';
        const stringField = String(field);
        if (
          stringField.includes('"') ||
          stringField.includes(SEPARATOR) ||
          stringField.includes("\n")
        ) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return `"${stringField}"`;
      };

      let csvContent = headers.join(SEPARATOR) + "\n";

      Locals.forEach((est) => {
        const row = [
          est.localId,
          est.nomeLocal,
          est.categoria,
          est.nomeResponsavel,
          est.cpfResponsavel,
          est.contatoLocal,
          est.endereco,
          est.descricao,
          est.instagram,
          est.latitude,
          est.longitude,
          est.status,
        ];

        csvContent += row.map(escapeCsvField).join(SEPARATOR) + "\n";
      });

      res.header("Content-Type", "text/csv; charset=utf-8");
      res.attachment("Locals_ativos_meidesaqua.csv");
      return res.status(200).send(csvContent);
    } catch (error) {
      console.error("Erro ao exportar Locals:", error);
      return res
        .status(500)
        .json({ message: "Erro ao gerar arquivo de exportação." });
    }
  }

  static async getDashboardStats(req: Request, res: Response) {
    try {
      // Atualizando para não buscar os campos escala e venda (que foram excluídos)
      const Locais = await Local.findAll({
        where: { status: StatusLocal.ATIVO },
        attributes: ["localId", "categoria"], 
      });

      const totalLocais = Locais.length;

      const avaliacoes = await Avaliacao.findAll({
        where: { parentId: null },
        attributes: ["nota"],
      });

      const totalAvaliacoes = avaliacoes.length;
      let somaNotas = 0;
      const distribuicaoNotas = [0, 0, 0, 0, 0];

      avaliacoes.forEach((a) => {
        if (a.nota) {
          somaNotas += a.nota;
          const notaIndex = Math.floor(a.nota) - 1;
          if (notaIndex >= 0 && notaIndex < 5) {
            distribuicaoNotas[notaIndex]++;
          }
        }
      });

      const mediaAvaliacao =
        totalAvaliacoes > 0 ? (somaNotas / totalAvaliacoes).toFixed(1) : 0;

      const chartDistribuicaoNotas = distribuicaoNotas.map((qtd, index) => ({
        nota: `${index + 1} Estrela${index !== 0 ? "s" : ""}`,
        qtd: qtd,
      }));

      const categoriasMap: { [key: string]: number } = {};

      Locais.forEach((e) => {
        if (e.categoria) {
          const catNome = e.categoria.charAt(0).toUpperCase() + e.categoria.slice(1).toLowerCase();
          categoriasMap[catNome] = (categoriasMap[catNome] || 0) + 1;
        }
      });

      const chartLocaisPorCategoria = Object.entries(categoriasMap)
        .map(([categoria, qtd]) => ({ categoria, qtd }))
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 10);

      const totalUsuarios = await Usuario.count();
      const visualizacoesRaw = await ContadorVisualizacao.findAll();

      const pageViews = { home: 0, espacoExplore: 0, categoriasTotal: 0 };
      const mapaVisualizacoes: { [key: string]: number } = {};
      const mapaCursos: { [key: string]: number } = {};
      
      const espacoExploreClicks = { gov: 0, wpp: 0, email: 0 };
      let perfilCompartilhado = 0;

      visualizacoesRaw.forEach((v) => {
        if (v.identificador === "HOME") {
          pageViews.home = v.visualizacoes;
        } else if (v.identificador === "ESPACO_MEI") {
          pageViews.espacoExplore = v.visualizacoes;
        } else if (v.identificador.startsWith("CAT_")) {
          let nomeCat = v.identificador.replace("CAT_", "").replace(/_/g, " ").toLowerCase();
          nomeCat = nomeCat.charAt(0).toUpperCase() + nomeCat.slice(1);
          mapaVisualizacoes[nomeCat] = v.visualizacoes;
          pageViews.categoriasTotal += v.visualizacoes;
        } else if (v.identificador.startsWith("CURSO_")) {
          let nomeCurso = v.identificador.replace("CURSO_", "").replace(/_/g, " ").toLowerCase();
          nomeCurso = nomeCurso.charAt(0).toUpperCase() + nomeCurso.slice(1);
          mapaCursos[nomeCurso] = v.visualizacoes;
        }
        else if (v.identificador === "LINK_GOV") {
          espacoExploreClicks.gov = v.visualizacoes;
        } else if (v.identificador === "LINK_WPP") {
          espacoExploreClicks.wpp = v.visualizacoes;
        } else if (v.identificador === "LINK_EMAIL") {
          espacoExploreClicks.email = v.visualizacoes;
        } else if (v.identificador === "PROFILE_SHARE") {
          perfilCompartilhado = v.visualizacoes;
        }
      });

      const chartCursos = Object.entries(mapaCursos)
        .map(([curso, qtd]) => ({ curso, qtd }))
        .sort((a, b) => b.qtd - a.qtd);

      const chartVisualizacoesPorCategoria = Object.entries(mapaVisualizacoes)
        .map(([categoria, views]) => ({ categoria, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      return res.json({
        totalLocais,
        totalUsuarios,
        totalAvaliacoes,
        mediaAvaliacao,
        chartLocaisPorCategoria,
        chartVisualizacoesPorCategoria,
        chartDistribuicaoNotas,
        pageViews,
        chartCursos,
        espacoExploreClicks,
        perfilCompartilhado
      });
    } catch (error) {
      console.error("Erro dashboard:", error);
      return res.status(500).json({ message: "Erro ao buscar estatísticas." });
    }
  }
}