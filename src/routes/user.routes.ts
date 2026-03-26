import { Router } from 'express';
import UserController from '../controllers/UserController';
import { authMiddleware } from '../middlewares/auth.middleware';
import Usuario from '../entities/Usuario.entity';
import Local from '../entities/Local.entity';
import UsuarioLocal from '../entities/UsuarioLocal.entity';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.resolve("uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const router = Router();

router.use(authMiddleware);

router.post('/profile', 
    UserController.updateUserProfile
);
router.get('/profile/estabelecimentos',
  UserController.listarMeusEstabelecimentos
);router.put('/profile/estabelecimentos/:localId',
    upload.fields([
        { name: "logo", maxCount: 1 },
        { name: "imagens", maxCount: 4 },
    ]),
    UserController.atualizarMeuEstabelecimento
);router.delete('/profile', 
    UserController.deleteUserProfile
);
router.put('/password', 
    UserController.updateUserPassword
);

// Rota para marcar que o usuário visitou um local
router.post('/:userId/visits', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { localId } = req.body;

    if (Number.isNaN(userId) || !localId) {
      return res.status(400).json({ message: 'Parâmetros inválidos' });
    }

    // checar usuário autenticado
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

    // Cria ou atualiza registro de visita
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
    console.error('Erro ao registrar visita via rota:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;