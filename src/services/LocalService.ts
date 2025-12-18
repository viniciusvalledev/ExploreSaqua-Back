import { Op } from "sequelize";
import sequelize from "../config/database";
import Local, {
  StatusLocal,
} from "../entities/Local.entity";
import ImagemLocal from "../entities/ImagemLocal.entity";
import Avaliacao from "../entities/Avaliacao.entity";
import CnpjService from "./CnpjService";
import Usuario from "../entities/Usuario.entity"; // ADICIONADO: Necessário para a busca aninhada

class LocalService {

  // --- MÉTODOS EXISTENTES (INTACTOS) ---
  // A lógica de cadastro com validação de CNPJ é crucial
  // e foi mantida exatamente como estava no seu original do MeiDeSaquá.

  public async cadastrarLocalComImagens(
    dados: any
  ): Promise<Local> {
    if (!dados.cnpj) {
      throw new Error("O campo CNPJ é obrigatório.");
    }

    try {
      const dadosCnpj = await CnpjService.consultarCnpj(dados.cnpj);
      const situacao = String(dadosCnpj.situacao_cadastral);

      if (situacao !== "ATIVA" && situacao !== "2") {
        const mapaStatus: { [key: string]: string } = {
          "1": "NULA",
          "01": "NULA",
          "3": "SUSPENSA",
          "03": "SUSPENSA",
          "4": "INAPTA",
          "04": "INAPTA",
          "8": "BAIXADA",
          "08": "BAIXADA",
        };
        const statusLegivel = mapaStatus[situacao] || situacao;

        throw new Error(
          `O CNPJ está com a situação "${statusLegivel}". Apenas CNPJs com situação "ATIVA" são permitidos. Em caso de dúvidas, entre em contato com a Sala do Empreendedor.`
        );
      }

      const nomeCidade = dadosCnpj.municipio?.toUpperCase();
      if (nomeCidade !== "SAQUAREMA") {
        throw new Error(
          `Este CNPJ pertence à cidade de ${
            dadosCnpj.municipio || "desconhecida"
          }. Apenas CNPJs de Saquarema são permitidos. Em caso de dúvidas, entre em contato com a Sala do Empreendedor.`
        );
      }
    } catch (error: any) {
      throw new Error(error.message);
    }

    const transaction = await sequelize.transaction();
    try {
      const emailExistente = await Local.findOne({
        where: { emailLocal: dados.emailLocal },
        transaction,
      });
      if (emailExistente) {
        throw new Error("E-mail já cadastrado no sistema.");
      }

      const cnpjExistente = await Local.findOne({
        where: { cnpj: dados.cnpj },
        transaction,
      });
      if (cnpjExistente) {
        throw new Error("CNPJ já cadastrado no sistema.");
      }

      const dadosParaCriacao = {
        nomeFantasia: dados.nomeFantasia,
        cnpj: dados.cnpj,
        categoria: dados.categoria,
        nomeResponsavel: dados.nome_responsavel,
        cpfResponsavel: dados.cpf_responsavel,
        cnae: dados.cnae,
        emailLocal: dados.emailLocal,
        contatoLocal: dados.contatoLocal,
        endereco: dados.endereco,
        descricao: dados.descricao,
        descricaoDiferencial: dados.descricaoDiferencial,
        areasAtuacao: dados.areasAtuacao,
        tagsInvisiveis: dados.tagsInvisiveis,
        website: dados.website,
        instagram: dados.instagram,
        logoUrl: dados.logo,
        ccmeiUrl: dados.ccmei,
        venda: dados.venda,
        escala: dados.escala,
      };

      const local = await Local.create(dadosParaCriacao, {
        transaction,
      });

      if (dados.produtos && dados.produtos.length > 0) {
        const imagens = dados.produtos.map((url: string) => ({
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

  public async solicitarAtualizacaoPorCnpj(
    cnpj: string,
    dadosAtualizacao: any
  ): Promise<Local> {
    const local = await Local.findOne({ where: { cnpj } });

    if (!local) {
      throw new Error("Local não encontrado.");
    }

    local.status = StatusLocal.PENDENTE_ATUALIZACAO;
    local.dados_atualizacao = dadosAtualizacao;
    await local.save();

    return local;
  }

  public async solicitarExclusaoPorCnpj(
    dadosExclusao: any // Recebe o objeto completo do controller
  ): Promise<void> {
    const { cnpj } = dadosExclusao; // Extrai o CNPJ dos dados

    const local = await Local.findOne({ where: { cnpj } });

    if (!local) {
      throw new Error("Local não encontrado.");
    }

    local.status = StatusLocal.PENDENTE_EXCLUSAO;
    // Guarda todos os dados da solicitação no campo JSON
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

  public async buscarPorNome(nome: string): Promise<Local[]> {
    return Local.findAll({
      where: {
        nomeFantasia: {
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

  // --- MÉTODO 'buscarPorId' TOTALMENTE REFATORADO ---
  // Incorpora a lógica de 'buscarPorNomeUnico' do ProjetoService,
  // buscando avaliações aninhadas e calculando a média.
  public async buscarPorId(id: number): Promise<Local | null> {
    try {
      const local = await Local.findOne({
        where: {
          localId: id,
          status: StatusLocal.ATIVO,
        },
        // Não precisamos de 'include' aqui,
        // pois vamos buscar as associações separadamente para montar o objeto
      });

      if (!local) {
        return null;
      }

      // 1. Buscar imagens
      const imagens = await ImagemLocal.findAll({
        where: { localId: local.localId },
        attributes: ["url"],
      });

      // 2. Buscar avaliações (com a nova lógica de aninhamento)
      const avaliacoes = await Avaliacao.findAll({
        where: {
          localId: local.localId,
          parent_id: null, // Buscar APENAS comentários principais
        },
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["nomeCompleto", "usuarioId", "username"], // Ajuste os atributos conforme necessário
          },
          {
            model: Avaliacao,
            as: "respostas",
            required: false,
            include: [
              {
                model: Usuario,
                as: "usuario",
                attributes: ["nomeCompleto", "usuarioId", "username"], // Ajuste os atributos
              },
            ],
          },
        ],
        order: [
          ["avaliacoesId", "DESC"], // Pais mais novos primeiro
          [{ model: Avaliacao, as: "respostas" }, "avaliacoesId", "ASC"], // Respostas em ordem cronológica
        ],
      });

      // 3. Montar o JSON de resposta (similar ao ODS Service)
      const localJSON = local.toJSON();
      
      // Anexa as imagens e avaliações
      (localJSON as any).produtosImg = imagens;
      (localJSON as any).avaliacoes = avaliacoes;

      // 4. Calcular a média (movido do controller para o service)
      if (avaliacoes && avaliacoes.length > 0) {
        // Filtra para garantir que só notas de comentários principais sejam contadas
        const notasPrincipais = avaliacoes
          .map(a => a.nota)
          .filter(n => n !== null) as number[];
          
        if (notasPrincipais.length > 0) {
           const somaDasNotas = notasPrincipais.reduce((acc, nota) => acc + nota, 0);
           (localJSON as any).media = parseFloat(
            (somaDasNotas / notasPrincipais.length).toFixed(1)
           );
        } else {
           (localJSON as any).media = 0; // Caso só haja respostas sem nota (improvável)
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

  // --- MÉTODOS RESTANTES (INTACTOS) ---
  
  public async alterarStatusAtivo(
    id: number,
    ativo: boolean
  ): Promise<Local> {
    const local = await Local.findByPk(id);
    if (!local) {
      throw new Error("Local não encontrado.");
    }
    local.ativo = ativo;

    // Atualiza o 'status' para refletir a mudança
    if (ativo === false) {
      // Define um status inativo (REJEITADO é uma boa opção do seu Enum)
      local.status = StatusLocal.REJEITADO;
    } else {
      // Se estiver reativando, define o status como ATIVO
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
          as: "produtosImg", // ESSA ASSOCIAÇÃO É CRUCIAL
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