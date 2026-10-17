import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import ServicoController from '../controller/servico.js';

const router = express.Router();

//Leitura para qualquer utilizador autenticado; escrita requer "servicos:escrever"
router.get('/servicos', authenticate, ServicoController.getServicos);
router.get('/servicos/:id', authenticate, ServicoController.getServicoById);
router.get('/servicos/:id/historico-precos', authenticate, ServicoController.getHistoricoPrecos);
router.post('/servicos', authenticate, authorizePermission('servicos:escrever'), ServicoController.createServico);
router.put('/servicos/:id', authenticate, authorizePermission('servicos:escrever'), ServicoController.updateServico);
router.patch('/servicos/:id/estado', authenticate, authorizePermission('servicos:escrever'), ServicoController.updateEstadoServico);
router.delete('/servicos/:id', authenticate, authorizePermission('servicos:escrever'), ServicoController.deleteServico);

export default router;
