import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import FidelizacaoController from '../controller/fidelizacao.js';

const router = express.Router();

//Progresso do cartao (qualquer utilizador autenticado) e correcao autorizada
router.get('/clientes/:id/fidelizacao', authenticate, FidelizacaoController.getFidelizacao);
router.post('/clientes/:id/fidelizacao/correcao', authenticate, authorizePermission('fidelizacao:corrigir'), FidelizacaoController.corrigirFidelizacao);

export default router;
