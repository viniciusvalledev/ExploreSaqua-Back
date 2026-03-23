import { Request, Response } from 'express';
import VisitService from '../services/VisitService';

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

      const result = await VisitService.markVisited(userId, Number(localId));

      return res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error('Erro ao marcar visita:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}

export default VisitController;
