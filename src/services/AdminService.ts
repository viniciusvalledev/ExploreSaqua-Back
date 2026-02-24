import Local, { StatusLocal } from "../entities/Local.entity";
import ImagemLocal from "../entities/ImagemLocal.entity";

class AdminService {
  /**
   * Aprova um novo local que foi cadastrado
   */
  public async aprovarNovoLocal(localId: number): Promise<Local> {
    const local = await Local.findByPk(localId);
    if (!local) throw new Error("Local não encontrado");

    local.status = StatusLocal.ATIVO;
    local.ativo = true;

    await local.save();
    return local;
  }

  /**
   * Aprova as atualizações solicitadas por um proprietário.
   * Esta função pega o que está guardado no campo 'dados_atualizacao' 
   * e move para as colunas principais da tabela.
   */
  public async aprovarAtualizacao(localId: number): Promise<Local> {
    const local = await Local.findByPk(localId);
    
    if (!local) throw new Error("Local não encontrado");
    if (!local.dados_atualizacao) throw new Error("Não há atualizações pendentes para este local");

    const novosDados = local.dados_atualizacao as any;

    // 1. Atualiza campos de texto se eles existirem no JSON
    if (novosDados.nomeLocal) local.nomeLocal = novosDados.nomeLocal;
    if (novosDados.categoria) local.categoria = novosDados.categoria;
    if (novosDados.descricao) local.descricao = novosDados.descricao;
    if (novosDados.endereco) local.endereco = novosDados.endereco;
    if (novosDados.contatoLocal) local.contatoLocal = novosDados.contatoLocal;
    if (novosDados.instagram) local.instagram = novosDados.instagram;
    if (novosDados.latitude) local.latitude = novosDados.latitude;
    if (novosDados.longitude) local.longitude = novosDados.longitude;
    
    // 2. Atualiza campos de contato do responsável (Novos campos que adicionamos)
    if (novosDados.emailResponsavel) local.emailResponsavel = novosDados.emailResponsavel;
    if (novosDados.contatoResponsavel) local.contatoResponsavel = novosDados.contatoResponsavel;

    // 3. Atualiza URLs de arquivos e documentos
    if (novosDados.logoUrl) local.logoUrl = novosDados.logoUrl;
    if (novosDados.alvaraVigilanciaUrl) local.alvaraVigilanciaUrl = novosDados.alvaraVigilanciaUrl;
    if (novosDados.alvaraFuncionamentoUrl) local.alvaraFuncionamentoUrl = novosDados.alvaraFuncionamentoUrl;

    // 4. Se houver novas imagens na galeria dentro do JSON
    if (novosDados.imagens && Array.isArray(novosDados.imagens)) {
      // Opcional: Deletar imagens antigas antes de salvar as novas
      await ImagemLocal.destroy({ where: { localId } });
      
      for (const url of novosDados.imagens) {
        await ImagemLocal.create({ localId, url });
      }
    }

    // 5. Finaliza a transição
    local.dados_atualizacao = null; // Limpa o rascunho
    local.status = StatusLocal.ATIVO; // Volta a ficar ativo
    local.ativo = true;

    await local.save();
    return local;
  }

  /**
   * Rejeita qualquer solicitação (Novo local, Atualização ou Exclusão)
   */
  public async rejeitarSolicitacao(localId: number): Promise<Local> {
    const local = await Local.findByPk(localId);
    if (!local) throw new Error("Local não encontrado");

    // Se for um novo cadastro sendo rejeitado, vai para status REJEITADO
    // Se for uma atualização rejeitada, apenas limpa o rascunho e volta a ser ATIVO
    if (local.status === StatusLocal.PENDENTE_ATUALIZACAO) {
        local.dados_atualizacao = null;
        local.status = StatusLocal.ATIVO;
    } else {
        local.status = StatusLocal.REJEITADO;
        local.ativo = false;
    }

    await local.save();
    return local;
  }

  /**
   * Aprova a exclusão definitiva do local
   */
  public async aprovarExclusao(localId: number): Promise<void> {
    const local = await Local.findByPk(localId);
    if (!local) throw new Error("Local não encontrado");

    // Deleta imagens relacionadas primeiro (Cascade manual se não houver no banco)
    await ImagemLocal.destroy({ where: { localId } });
    
    // Deleta o local
    await local.destroy();
  }

  /**
   * Lista todas as solicitações pendentes para o painel do Admin
   */
  public async listarPendencias() {
    return await Local.findAll({
      where: {
        status: [
          StatusLocal.PENDENTE_APROVACAO, 
          StatusLocal.PENDENTE_ATUALIZACAO, 
          StatusLocal.PENDENTE_EXCLUSAO
        ]
      }
    });
  }
}

export default new AdminService();