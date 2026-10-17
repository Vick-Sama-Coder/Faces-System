import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import AtendimentoController from '../controller/atendimento.js';

const router = express.Router();

//Leitura para qualquer utilizador autenticado; escrita requer as permissoes indicadas
router.get('/atendimentos', authenticate, AtendimentoController.getAtendimentos);
router.get('/atendimentos/:id', authenticate, AtendimentoController.getAtendimentoById);
router.post('/atendimentos', authenticate, authorizePermission('atendimentos:escrever'), AtendimentoController.createAtendimento);
router.put('/atendimentos/:id', authenticate, authorizePermission('atendimentos:escrever'), AtendimentoController.updateAtendimento);
router.post('/atendimentos/:id/servicos', authenticate, authorizePermission('atendimentos:escrever'), AtendimentoController.addServico);
router.delete('/atendimentos/:id/servicos/:itemId', authenticate, authorizePermission('atendimentos:escrever'), AtendimentoController.removeServico);
router.patch('/atendimentos/:id/concluir', authenticate, authorizePermission('atendimentos:escrever'), AtendimentoController.concluirAtendimento);
router.post('/atendimentos/:id/anular', authenticate, authorizePermission('atendimentos:anular'), AtendimentoController.anularAtendimento);

export default router;
