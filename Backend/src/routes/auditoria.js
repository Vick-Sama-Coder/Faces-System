import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import AuditoriaController from '../controller/auditoria.js';

const router = express.Router();

//o registo so e consultavel por quem tem auditoria:ler (RN21)
router.get('/auditoria', authenticate, authorizePermission('auditoria:ler'), AuditoriaController.getAuditoria);
router.get('/auditoria/opcoes', authenticate, authorizePermission('auditoria:ler'), AuditoriaController.getOpcoes);
router.get('/auditoria/:id', authenticate, authorizePermission('auditoria:ler'), AuditoriaController.getAuditoriaById);

export default router;
