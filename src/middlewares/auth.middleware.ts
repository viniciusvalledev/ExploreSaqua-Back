import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        username: string;
    }
}

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'seu-segredo-admin-super-secreto';

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.substring(7); 

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; username: string };
        
        req.user = decoded;
        
        next(); 
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
}

export function authOrAdminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.substring(7);

    try {
        const decodedUser = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; username: string };
        req.user = decodedUser;
        return next();
    } catch (error) {
        // Tenta validar como token de admin caso não seja token de usuário.
    }

    try {
        const decodedAdmin = jwt.verify(token, ADMIN_JWT_SECRET) as { username?: string; role?: string };
        if (decodedAdmin.role === 'admin') {
            (req as any).admin = {
                username: decodedAdmin.username,
                role: decodedAdmin.role,
            };
            return next();
        }
    } catch (error) {
        // Se também falhar como admin, retorna não autorizado.
    }

    return res.status(401).json({ message: 'Token inválido ou expirado.' });
}