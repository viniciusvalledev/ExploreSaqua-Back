import { Request, Response } from 'express';
import Usuario from '../entities/Usuario.entity';
import Local from '../entities/Local.entity';
import UsuarioLocal from '../entities/UsuarioLocal.entity';

class VisitController {
  public static async markVisited(req: Request, res: Response): Promise<Response> {
    try {
      const userId = Number(req.params.userId);
      const { localId } = req.body;

      if (Number.isNaN(userId) || !localId) {
        return res.status(400).json({ message: 'Parâmetros inválidos' });
      }

      // Garante que o usuário autenticado é o mesmo do path
      const authUser = (req as any).user;
      if (!authUser || authUser.id !== userId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      // Verifica existência do usuário
      const user = await Usuario.findByPk(userId);
      if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

      // Verifica existência do local
      const local = await Local.findByPk(Number(localId));
      if (!local) return res.status(404).json({ message: 'Local não encontrado' });

      // Cria ou atualiza registro de visita (evita duplicatas)
      const [record, created] = await UsuarioLocal.findOrCreate({
        where: { usuarioId: userId, localId: Number(localId) },
        defaults: { usuarioId: userId, localId: Number(localId) },
      });

      if (!created) {
        record.set('visitedAt', new Date());
        await record.save();
      }

      return res.status(200).json({ message: 'Visita registrada', visited: true, created: !!created });
    } catch (error: any) {
      console.error('Erro ao marcar visita:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}

export default VisitController;
