import { Op } from "sequelize";
import sequelize from "../config/database";
import Local, { StatusLocal } from "../entities/Local.entity";
import ImagemLocal from "../entities/ImagemLocal.entity";
import Avaliacao from "../entities/Avaliacao.entity";
import Usuario from "../entities/Usuario.entity";
import { Request, Response } from "express";

class LocalService {
  localService: any;
public async cadastrarLocalComImagens(dados: any): Promise<Local> {
    const transaction = await sequelize.transaction();
    try {
const dadosParaCriacao = {
  nomeLocal: String(dados.nomeLocal),
  categoria: String(dados.categoria),
  nomeResponsavel: String(dados.nomeResponsavel),
  cpfResponsavel: String(dados.cpfResponsavel),
  emailResponsavel: String(dados.emailResponsavel || dados.emailContato),
  contatoResponsavel: String(dados.contatoResponsavel),
  contatoLocal: String(dados.contatoLocal),
  
  endereco: String(dados.endereco),
  descricao: String(dados.descricao),
  instagram: String(dados.instagram),
  latitude: dados.latitude ? parseFloat(String(dados.latitude)) : null,
  longitude: dados.longitude ? parseFloat(String(dados.longitude)) : null,
  logoUrl: String(dados.logoUrl),
  alvaraFuncionamentoUrl: String(dados.alvaraFuncionamentoUrl),
  alvaraVigilanciaUrl: String(dados.alvaraVigilanciaUrl),
  ativo: false,
  status: StatusLocal.PENDENTE_APROVACAO,
};

      const local = await Local.create(dadosParaCriacao, { transaction });

      // Galeria de imagens
      if (dados.imagens && dados.imagens.length > 0) {
        const imagens = dados.imagens.map((url: string) => ({
          url,
          local_id: local.localId, // Verifique se na sua entidade o campo é localId ou local_id
        }));
        await ImagemLocal.bulkCreate(imagens, { transaction });
      }

      await transaction.commit();
      return local;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

public solicitarAtualizacao = async (p0: number, req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const body = req.body;
        
        // O Multer coloca os arquivos em req.files quando usamos upload.fields()
        const files = (req as any).files as { [fieldname: string]: Express.Multer.File[] };

        // Chama o service que você postou acima
        const local = await this.localService.solicitarAtualizacao(
            Number(id),
            body,
            files
        );

        res.status(200).json(local);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

  public async solicitarExclusao(
    id: number,
    dadosExclusao: any,
  ): Promise<void> {
    const local = await Local.findByPk(id);

    if (!local) {
      throw new Error("Local não encontrado.");
    }

    local.status = StatusLocal.PENDENTE_EXCLUSAO;
    local.dados_atualizacao = dadosExclusao;
    await local.save();
  }

  public async listarTodos(): Promise<Local[]> {
    return Local.findAll({
      where: {
        status: StatusLocal.ATIVO,
      },
      include: [
        {
          model: ImagemLocal,
          as: "produtosImg",
          attributes: ["url"],
        },
      ],
    });
  }

  public async buscarPorCategoria(categoria: string): Promise<Local[]> {
    return Local.findAll({
      where: {
        categoria: { [Op.like]: `%${categoria}%` },
        status: StatusLocal.ATIVO,
      },
      include: [
        {
          model: ImagemLocal,
          as: "produtosImg",
          attributes: ["url"],
        },
      ],
    });
  }

  public async buscarPorNome(nome: string): Promise<Local[]> {
    return Local.findAll({
      where: {
        nomeLocal: {
          [Op.like]: `%${nome}%`,
        },
        status: StatusLocal.ATIVO,
      },
      include: [
        {
          model: ImagemLocal,
          as: "produtosImg",
          attributes: ["url"],
        },
      ],
    });
  }

  public async buscarPorId(id: number): Promise<Local | null> {
    try {
      const local = await Local.findOne({
        where: {
          localId: id,
          status: StatusLocal.ATIVO,
        },
      });

      if (!local) {
        return null;
      }

      const imagens = await ImagemLocal.findAll({
        where: { localId: local.localId },
        attributes: ["url"],
      });

      const avaliacoes = await Avaliacao.findAll({
        where: {
          localId: local.localId,
          parent_id: null,
        },
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["nomeCompleto", "usuarioId", "username"],
          },
          {
            model: Avaliacao,
            as: "respostas",
            required: false,
            include: [
              {
                model: Usuario,
                as: "usuario",
                attributes: ["nomeCompleto", "usuarioId", "username"],
              },
            ],
          },
        ],
        order: [
          ["avaliacoesId", "DESC"],
          [{ model: Avaliacao, as: "respostas" }, "avaliacoesId", "ASC"],
        ],
      });

      const localJSON = local.toJSON();
      (localJSON as any).produtosImg = imagens;
      (localJSON as any).avaliacoes = avaliacoes;

      if (avaliacoes && avaliacoes.length > 0) {
        const notasPrincipais = avaliacoes
          .map((a) => a.nota)
          .filter((n) => n !== null) as number[];

        if (notasPrincipais.length > 0) {
          const somaDasNotas = notasPrincipais.reduce(
            (acc, nota) => acc + nota,
            0,
          );
          (localJSON as any).media = parseFloat(
            (somaDasNotas / notasPrincipais.length).toFixed(1),
          );
        } else {
          (localJSON as any).media = 0;
        }
      } else {
        (localJSON as any).media = 0;
      }

      return localJSON as Local;
    } catch (error) {
      console.error("[LocalService] Erro ao buscarPorId:", error);
      throw error;
    }
  }

  public async alterarStatusAtivo(id: number, ativo: boolean): Promise<Local> {
    const local = await Local.findByPk(id);
    if (!local) {
      throw new Error("Local não encontrado.");
    }
    local.ativo = ativo;

    if (ativo === false) {
      local.status = StatusLocal.REJEITADO;
    } else {
      local.status = StatusLocal.ATIVO;
    }

    await local.save();
    return local;
  }

  public async listarPendentes(): Promise<{
    cadastros: Local[];
    atualizacoes: Local[];
    exclusoes: Local[];
  }> {
    const commonOptions = {
      include: [
        {
          model: ImagemLocal,
          as: "produtosImg",
          attributes: ["url"],
        },
      ],
    };

    const cadastros = await Local.findAll({
      where: { status: StatusLocal.PENDENTE_APROVACAO },
      ...commonOptions,
    });

    const atualizacoes = await Local.findAll({
      where: { status: StatusLocal.PENDENTE_ATUALIZACAO },
      ...commonOptions,
    });

    const exclusoes = await Local.findAll({
      where: { status: StatusLocal.PENDENTE_EXCLUSAO },
      ...commonOptions,
    });

    return { cadastros, atualizacoes, exclusoes };
  }
}

export default new LocalService();
