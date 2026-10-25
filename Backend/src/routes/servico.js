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

// Modalidades de preco de um servico
router.get('/servicos/:id/modalidades', authenticate, ServicoController.getModalidades);
router.post('/servicos/:id/modalidades', authenticate, authorizePermission('servicos:escrever'), ServicoController.createModalidade);
router.put('/servicos/modalidades/:id', authenticate, authorizePermission('servicos:escrever'), ServicoController.updateModalidade);
router.delete('/servicos/modalidades/:id', authenticate, authorizePermission('servicos:escrever'), ServicoController.deleteModalidade);

// Aplicacoes associadas a um servico principal
router.get('/servicos/:id/aplicacoes', authenticate, ServicoController.getAplicacoes);
router.post('/servicos/:id/aplicacoes', authenticate, authorizePermission('servicos:escrever'), ServicoController.associarAplicacao);
router.delete('/servicos/:id/aplicacoes/:aplicacaoId', authenticate, authorizePermission('servicos:escrever'), ServicoController.desassociarAplicacao);

export default router;