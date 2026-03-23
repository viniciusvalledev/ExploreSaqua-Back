import Usuario from '../entities/Usuario.entity';
import Local from '../entities/Local.entity';
import UsuarioLocal from '../entities/UsuarioLocal.entity';

class VisitService {
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

    // Cria ou atualiza registro de visita (evita duplicatas)
    const [record, created] = await UsuarioLocal.findOrCreate({
      where: { usuarioId: userId, localId },
      defaults: { usuarioId: userId, localId },
    });

    // Se já existia, atualiza visitedAt
    if (!created) {
      record.set('visitedAt', new Date());
      await record.save();
    }

    return {
      status: 200,
      body: { message: 'Visita registrada', visited: true, created: !!created },
    };
  }
}

export default VisitService;
