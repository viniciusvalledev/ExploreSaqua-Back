import { Avaliacao, Local, Usuario } from "../entities";
import ProfanityFilter from "../utils/ProfanityFilter";
import { containsEmoji } from "../utils/ValidationEmoji";
import EmailService from "../utils/EmailService";

class AvaliacaoService {
  public async submeterAvaliacao(dadosAvaliacao: any, usuarioLogadoId: number) {
    const { nota, comentario, localId, parent_id } = dadosAvaliacao;

    // Validações (estavam corretas)
    if (!localId) {
      throw new Error("O ID do local é obrigatório.");
    }
    if (ProfanityFilter.contemPalavrao(comentario)) {
      throw new Error("Você utilizou palavras inapropriadas.");
    }
    if (containsEmoji(comentario)) {
      throw new Error("O comentário não pode conter emojis.");
    }

    const local = await Local.findByPk(localId);
    if (!local) {
      throw new Error(
        `Local não encontrado com o ID: ${localId}`
      );
    }

    let notaFinal: number | null = nota;

    if (parent_id) {
      // É UMA RESPOSTA
      notaFinal = null; // Respostas não têm nota

      const parentAvaliacao = await Avaliacao.findByPk(parent_id);
      if (!parentAvaliacao) {
        throw new Error("Comentário pai não encontrado.");
      }
      if (parentAvaliacao.parentId !== null) {
        throw new Error("Não é possível responder a uma resposta.");
      }
      if (
        parentAvaliacao.localId !== local.localId
      ) {
        throw new Error(
          "A resposta não pertence ao mesmo local do comentário pai."
        );
      }
    } else {
      // É UM COMENTÁRIO PRINCIPAL
      if (!nota || nota < 1 || nota > 5) {
        throw new Error(
          "A nota da avaliação (1 a 5) é obrigatória para um novo comentário."
        );
      }

      const avaliacaoExistente = await Avaliacao.findOne({
        where: {
          usuarioId: usuarioLogadoId,
          localId: localId,
          parent_id: null,
        },
      });

      if (avaliacaoExistente) {
        throw new Error(
          "Cada usuário só pode avaliar um local uma vez."
        );
      }
    }

    // --- CORREÇÃO: ADICIONE A CRIAÇÃO DO COMENTÁRIO AQUI ---
    const novaAvaliacao = await Avaliacao.create({
      nota: notaFinal, // Será 'null' para respostas
      comentario,
      localId,
      usuarioId: usuarioLogadoId,
      parentId: parent_id || null, // Salva a referência pai, se existir
    });
    // --- FIM DA CORREÇÃO ---

    // --- Início da Notificação por E-mail (seu código, estava correto) ---
    try {
      const usuario = await Usuario.findByPk(usuarioLogadoId);

      if (local.emailLocal && usuario) {
        const eUmaResposta = parent_id
          ? "uma nova resposta"
          : "um novo comentário";
        const notaTexto = notaFinal ? `(Nota: ${notaFinal}/5)` : "";

        const subject = `[MeideSaquá] Novo Comentário no seu local: ${local.nomeLocal}`;
        const html = `
          <p>Olá, ${
            local.nomeResponsavel || local.nomeLocal
          },</p>
          <p>Seu local "<strong>${
            local.nomeLocal
          }</strong>" recebeu ${eUmaResposta} na plataforma MeideSaquá.</p>
          <br>
          <p><strong>Usuário:</strong> ${usuario.username}</p>
          <p><strong>Comentário ${notaTexto}:</strong></p>
          <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px; font-style: italic;">
            "${comentario}"
          </blockquote>
          <br>
          <p>Acesse a plataforma para ver mais detalhes.</p>
          <p>Atenciosamente,<br>Equipe MeideSaquá</p>
        `;

        await EmailService.sendGenericEmail({
          to: local.emailLocal as unknown as string,
          subject: subject,
          html: html,
        });
      }
    } catch (emailError: any) {
      console.error(
        `Falha ao enviar e-mail de notificação de avaliação para ${local.emailLocal}:`,
        emailError.message
      );
    }
    // --- Fim da Notificação por E-mail ---

    // Retorna o comentário/resposta que acabou de ser criado
    return novaAvaliacao;
  }

  public async atualizarAvaliacao(
    avaliacaoId: number,
    dadosAvaliacao: any,
    usuarioLogadoId: number
  ) {
    const avaliacao = await Avaliacao.findByPk(avaliacaoId);
    if (!avaliacao) {
      throw new Error(`Avaliação não encontrada com o ID: ${avaliacaoId}`);
    }
    if (avaliacao.usuarioId !== usuarioLogadoId) {
      throw new Error("Você não tem permissão para editar esta avaliação.");
    }

    if (
      dadosAvaliacao.comentario &&
      ProfanityFilter.contemPalavrao(dadosAvaliacao.comentario)
    ) {
      throw new Error("Você utilizou palavras inapropriadas.");
    }

    // MODIFICADO: Lógica para nota (DO SEU ARQUIVO ORIGINAL)
    // Só permite atualizar a nota se FOR UM COMENTÁRIO PRINCIPAL (sem parentId)
    if (avaliacao.parentId === null && dadosAvaliacao.nota != null) {
      if (dadosAvaliacao.nota < 1 || dadosAvaliacao.nota > 5) {
        throw new Error("A nota da avaliação deve estar entre 1 e 5.");
      }
      avaliacao.nota = dadosAvaliacao.nota;
    } else if (avaliacao.parentId !== null) {
      // Se for uma resposta, garante que a nota permaneça nula
      avaliacao.nota = null;
    }

    avaliacao.comentario = dadosAvaliacao.comentario ?? avaliacao.comentario;

    return await avaliacao.save();
  }

  public async excluirAvaliacao(avaliacaoId: number, usuarioLogadoId: number) {
    const avaliacao = await Avaliacao.findByPk(avaliacaoId);
    if (!avaliacao) {
      throw new Error(`Avaliação não encontrada com o ID: ${avaliacaoId}`);
    }
    if (avaliacao.usuarioId !== usuarioLogadoId) {
      throw new Error("Você não tem permissão para excluir esta avaliação.");
    }
    await avaliacao.destroy();
  }

  public async listarPorLocalDTO(localId: number) {
    return Avaliacao.findAll({
      where: {
        localId,
        parent_id: null, // Busca APENAS comentários principais
      },
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: {
            exclude: [
              "password",
              "email",
              "cpf",
              "dataNascimento",
              "enabled",
              "confirmationToken",
              "resetPasswordToken",
              "resetPasswordTokenExpiry",
              "unconfirmedEmail",
              "emailChangeToken",
            ],
          },
        },
        {
          model: Avaliacao,
          as: "respostas",
          required: false,
          include: [
            {
              model: Usuario,
              as: "usuario",
              attributes: {
                exclude: [
                  "password",
                  "email",
                  "cpf",
                  "dataNascimento",
                  "enabled",
                  "confirmationToken",
                  "resetPasswordToken",
                  "resetPasswordTokenExpiry",
                  "unconfirmedEmail",
                  "emailChangeToken",
                ],
              },
            },
          ],
        },
      ],
      order: [
        ["avaliacoesId", "DESC"],
        [{ model: Avaliacao, as: "respostas" }, "avaliacoesId", "ASC"],
      ],
    });
  }
}

export default new AvaliacaoService();
