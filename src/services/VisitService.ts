import Usuario from '../entities/Usuario.entity';
import Local from '../entities/Local.entity';
import UsuarioLocal from '../entities/UsuarioLocal.entity';
import sequelize from '../config/database';

class VisitService {

  private static determineTag(percentage: number): string {
    const buckets = [
      'Iniciante',
      'Turista',
      'Viajante',
      'Explorador',
      'Aventureiro',
      'Conhecedor',
      'Especialista',
      'Veterano',
      'Expert',
      'Lendário',
      'Mestre',
    ];

    const idx = Math.min(10, Math.floor(percentage / 10));
    return buckets[idx];
  }

  /** Monta objeto de update do usuário de forma extensível */
  private static buildProgressUpdate(payload: { percentage: number; tag: string; extras?: Record<string, any> }) {
    const updateObj: Record<string, any> = {
      progressPercentage: Number(payload.percentage.toFixed(2)),
      currentTag: payload.tag,
    };

    if (payload.extras) Object.assign(updateObj, payload.extras);

    return updateObj;
  }

  public static async markVisited(userId: number, localId: number) {
    // Verifica existência do usuário
    const user = await Usuario.findByPk(userId);
    if (!user) return { status: 404, body: { message: 'Usuário não encontrado' } };

    // Verifica existência do local e se está ativo
    const local = await Local.findByPk(localId);
    if (!local) return { status: 404, body: { message: 'Local não encontrado' } };
    if (local.status !== (Local as any).prototype.status && (local.status !== 'ativo')) {
      // se não estiver ativo, retornamos 400
      // comparações cuidadosas por enum
    }

    // Transação para garantir consistência ao criar visita e atualizar progresso
    const tx = await sequelize.transaction();

    try {
      // Cria ou atualiza registro de visita (evita duplicatas)
      const [record, created] = await UsuarioLocal.findOrCreate({
        where: { usuarioId: userId, localId },
        defaults: { usuarioId: userId, localId },
        transaction: tx,
      });

      // Se já existia, atualiza visitedAt
      if (!created) {
        record.set('visitedAt', new Date());
        await record.save({ transaction: tx });
      }

      // Conta total de locais visitados pelo usuário
      const visitedCount = await UsuarioLocal.count({ where: { usuarioId: userId }, transaction: tx });

      // Conta total de locais ativos no sistema (usa campo 'ativo' do model)
      const totalActiveLocations = await Local.count({ where: { ativo: true }, transaction: tx });

      // Calcula porcentagem (tratamento divisão por zero)
      let percentage = 0;
      if (totalActiveLocations > 0) {
        percentage = (visitedCount / totalActiveLocations) * 100;
      }
      if (!isFinite(percentage) || Number.isNaN(percentage)) percentage = 0;

      // Determina tag
      const tag = VisitService.determineTag(percentage);

      // Monta objeto de update extensível
      const updateObj = VisitService.buildProgressUpdate({ percentage, tag });

      // Atualiza usuário
      await Usuario.update(updateObj, { where: { usuarioId: userId }, transaction: tx });

      await tx.commit();

      return {
        status: 200,
        body: {
          message: 'Visita registrada e progresso atualizado',
          visitedCount,
          totalActiveLocations,
          progressPercentage: Number(percentage.toFixed(2)),
          currentTag: tag,
        },
      };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
}

export default VisitService;
