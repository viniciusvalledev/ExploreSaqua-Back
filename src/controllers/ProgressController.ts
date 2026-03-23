import { Request, Response } from 'express';
import ProgressService from '../services/ProgressService';

class ProgressController {
  public static async getProgress(req: Request, res: Response): Promise<Response> {
    try {
      const userId = Number(req.params.userId);
      if (Number.isNaN(userId)) return res.status(400).json({ message: 'userId inválido' });

      const result = await ProgressService.getUserProgress(userId);
      return res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error('Erro ao obter progresso do usuário:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}

export default ProgressController;
