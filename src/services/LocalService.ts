import { Op } from "sequelize";
import sequelize from "../config/database";
import Local, { StatusLocal } from "../entities/Local.entity";
import ImagemLocal from "../entities/ImagemLocal.entity";
import Avaliacao from "../entities/Avaliacao.entity";
import Usuario from "../entities/Usuario.entity";
import ProfanityFilter from "../utils/ProfanityFilter";

const normalizeString = (value: any): string | undefined => {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  const normalized = String(rawValue).trim();
  if (!normalized) {
    return undefined;
  }

  const lowered = normalized.toLowerCase();
  if (lowered === "undefined" || lowered === "null") {
    return undefined;
  }

  return normalized;
};

const parseOptionalNumber = (value: any): number | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

class LocalService {
public async cadastrarLocalComImagens(dados: any): Promise<Local> {
    const transaction = await sequelize.transaction();
    try {
      const usuarioId = dados.usuarioId ? Number(dados.usuarioId) : null;
      let usuarioPerfil: Usuario | null = null;
      let ultimoLocalDoUsuario: Local | null = null;

      if (usuarioId) {
        usuarioPerfil = await Usuario.findByPk(usuarioId, {
          attributes: ["email", "nomeCompleto", "username"],
          transaction,
        });

        ultimoLocalDoUsuario = await Local.findOne({
          where: { usuarioId },
          order: [["localId", "DESC"]],
          attributes: [
            "nomeResponsavel",
            "cpfResponsavel",
            "emailResponsavel",
            "contatoResponsavel",
          ],
          transaction,
        });
      }

      let emailResponsavel =
        normalizeString(dados.emailResponsavel) ?? normalizeString(dados.emailContato);

      if (!emailResponsavel && ultimoLocalDoUsuario) {
        emailResponsavel = normalizeString((ultimoLocalDoUsuario as any)?.emailResponsavel);
      }

      // Fallback para fluxo de perfil: se o e-mail não vier no form,
      // usa o e-mail da conta autenticada associada ao usuarioId.
      if (!emailResponsavel && usuarioPerfil) {
        emailResponsavel = normalizeString((usuarioPerfil as any)?.email);
      }

      let nomeResponsavel = normalizeString(dados.nomeResponsavel);

      if (!nomeResponsavel && ultimoLocalDoUsuario) {
        nomeResponsavel = normalizeString((ultimoLocalDoUsuario as any)?.nomeResponsavel);
      }

      // Fallback para fluxo de perfil: usa nome completo (ou username) do usuário logado.
      if (!nomeResponsavel && usuarioPerfil) {
        nomeResponsavel =
          normalizeString((usuarioPerfil as any)?.nomeCompleto) ??
          normalizeString((usuarioPerfil as any)?.username);
      }

      let cpfResponsavel = normalizeString(dados.cpfResponsavel);
      if (!cpfResponsavel && ultimoLocalDoUsuario) {
        cpfResponsavel = normalizeString((ultimoLocalDoUsuario as any)?.cpfResponsavel);
      }

      let contatoResponsavel = normalizeString(dados.contatoResponsavel);
      if (!contatoResponsavel && ultimoLocalDoUsuario) {
        contatoResponsavel = normalizeString((ultimoLocalDoUsuario as any)?.contatoResponsavel);
      }

      if (!emailResponsavel) {
        throw new Error("O campo 'emailResponsavel' é obrigatório.");
      }

      if (!nomeResponsavel) {
        throw new Error("O campo 'nomeResponsavel' é obrigatório.");
      }

      if (!cpfResponsavel) {
        throw new Error("O campo 'cpfResponsavel' é obrigatório.");
      }

      if (!contatoResponsavel) {
        throw new Error("O campo 'contatoResponsavel' é obrigatório.");
      }

      const dadosParaCriacao = {
        usuarioId,
        nomeLocal: normalizeString(dados.nomeLocal),
        categoria: normalizeString(dados.categoria),
        nomeResponsavel,
        cpfResponsavel,
        emailResponsavel,
        contatoResponsavel,
        contatoLocal: normalizeString(dados.contatoLocal),
        endereco: normalizeString(dados.endereco),
        descricao: normalizeString(dados.descricao),
        instagram: normalizeString(dados.instagram),
        latitude: parseOptionalNumber(dados.latitude),
        longitude: parseOptionalNumber(dados.longitude),
        logoUrl: normalizeString(dados.logoUrl),
        alvaraFuncionamentoUrl: normalizeString(dados.alvaraFuncionamentoUrl),
        alvaraVigilanciaUrl: normalizeString(dados.alvaraVigilanciaUrl),
        ativo: false,
        status: StatusLocal.PENDENTE_APROVACAO,

        // Campos opcionais para indicar que este cadastro é uma indicação
        tipoCadastro: normalizeString(dados.tipoCadastro),
        indicadorNome: normalizeString(dados.indicadorNome),
        indicadorContato: normalizeString(dados.indicadorContato),
        indicadorEmail: normalizeString(dados.indicadorEmail),
      };

      // Validação de conteúdo: verificar se algum campo contém palavrões
      const camposParaVerificar = ["nomeLocal", "descricao", "nomeResponsavel", "categoria", "endereco"];
      for (const campo of camposParaVerificar) {
        const valor = (dadosParaCriacao as any)[campo];
        if (typeof valor === "string" && ProfanityFilter.contemPalavrao(valor)) {
          throw new Error(`O campo '${campo}' contém palavras proibidas.`);
        }
      }

      // Verifica se já existe um local com o mesmo nome e status diferente de REJEITADO
      const localExistente = await Local.findOne({
        where: {
          nomeLocal: dadosParaCriacao.nomeLocal,
          status: { [Op.ne]: StatusLocal.REJEITADO },
        },
      });

      if (localExistente) {
        throw new Error("Já existe um local cadastrado com esse nome.");
      }

      const local = await Local.create(dadosParaCriacao, { transaction });

      const imagensInput = Array.isArray(dados.imagens)
        ? dados.imagens
        : Array.isArray(dados.produtos)
          ? dados.produtos
          : Array.isArray(dados.portfolio)
            ? dados.portfolio
            : [];

      // Galeria de imagens
      if (imagensInput.length > 0) {
        const imagens = imagensInput.map((url: string) => ({
          url,
          localId: local.localId,
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

  public async solicitarAtualizacao(
    id: number,
    dadosAtualizacao: any,
  ): Promise<Local> {
    const local = await Local.findByPk(id);

    if (!local) {
      throw new Error("Local não encontrado.");
    }

    const usuarioId = dadosAtualizacao?.usuarioId
      ? Number(dadosAtualizacao.usuarioId)
      : null;

    if (usuarioId && local.usuarioId && Number(local.usuarioId) !== usuarioId) {
      throw new Error("Você não tem permissão para atualizar este local.");
    }

    let emailResponsavel =
      normalizeString(dadosAtualizacao.emailResponsavel) ??
      normalizeString(dadosAtualizacao.emailContato) ??
      normalizeString(local.emailResponsavel);

    if (!emailResponsavel && usuarioId) {
      const usuarioPerfil = await Usuario.findByPk(usuarioId, {
        attributes: ["email"],
      });
      emailResponsavel = normalizeString((usuarioPerfil as any)?.email);
    }

    const imagensAtualizacao = Array.isArray(dadosAtualizacao.imagens)
      ? dadosAtualizacao.imagens
      : Array.isArray(dadosAtualizacao.produtos)
        ? dadosAtualizacao.produtos
        : Array.isArray(dadosAtualizacao.portfolio)
          ? dadosAtualizacao.portfolio
          : undefined;

    const atualizacaoLimpa = {
      ...dadosAtualizacao,
      nomeLocal: normalizeString(dadosAtualizacao.nomeLocal),
      categoria: normalizeString(dadosAtualizacao.categoria),
      nomeResponsavel:
        normalizeString(dadosAtualizacao.nomeResponsavel) ??
        normalizeString(local.nomeResponsavel),
      cpfResponsavel:
        normalizeString(dadosAtualizacao.cpfResponsavel) ??
        normalizeString(local.cpfResponsavel),
      emailResponsavel,
      contatoResponsavel:
        normalizeString(dadosAtualizacao.contatoResponsavel) ??
        normalizeString(local.contatoResponsavel),
      contatoLocal: normalizeString(dadosAtualizacao.contatoLocal),
      endereco: normalizeString(dadosAtualizacao.endereco),
      descricao: normalizeString(dadosAtualizacao.descricao),
      instagram: normalizeString(dadosAtualizacao.instagram),
      latitude: parseOptionalNumber(dadosAtualizacao.latitude),
      longitude: parseOptionalNumber(dadosAtualizacao.longitude),
      logoUrl: normalizeString(dadosAtualizacao.logoUrl),
      alvaraFuncionamentoUrl: normalizeString(dadosAtualizacao.alvaraFuncionamentoUrl),
      alvaraVigilanciaUrl: normalizeString(dadosAtualizacao.alvaraVigilanciaUrl),
      imagens: Array.isArray(imagensAtualizacao)
        ? imagensAtualizacao.filter((img: any) => !!normalizeString(img))
        : undefined,
    };

    local.status = StatusLocal.PENDENTE_ATUALIZACAO;
    local.dados_atualizacao = atualizacaoLimpa;
    await local.save();

    return local;
  }

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
          as: "locaisImg",
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
          as: "locaisImg",
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
          as: "locaisImg",
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
      (localJSON as any).locaisImg = imagens;
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
      // quando admin desativa manualmente, marque como INATIVO (não REJEITADO)
      local.status = StatusLocal.INATIVO;
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
          as: "locaisImg",
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

  public async listarInativos(): Promise<Local[]> {
    return Local.findAll({
      where: {
        status: StatusLocal.INATIVO,
      },
      include: [
        {
          model: ImagemLocal,
          as: "locaisImg",
          attributes: ["url"],
        },
      ],
    });
  }
}

export default new LocalService();
