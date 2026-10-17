import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import FuncionarioController from '../controller/funcionario.js';

const router = express.Router();

//Leitura para qualquer utilizador autenticado; escrita requer "funcionarios:escrever"
router.get('/funcionarios', authenticate, FuncionarioController.getFuncionarios);
router.get('/funcionarios/:id', authenticate, FuncionarioController.getFuncionarioById);
router.get('/funcionarios/:id/desempenho', authenticate, FuncionarioController.getDesempenho);
router.get('/funcionarios/:id/comissao', authenticate, FuncionarioController.getComissao);
router.post('/funcionarios', authenticate, authorizePermission('funcionarios:escrever'), FuncionarioController.createFuncionario);
router.put('/funcionarios/:id', authenticate, authorizePermission('funcionarios:escrever'), FuncionarioController.updateFuncionario);
router.patch('/funcionarios/:id/estado', authenticate, authorizePermission('funcionarios:escrever'), FuncionarioController.updateEstadoFuncionario);
router.put('/funcionarios/:id/comissao', authenticate, authorizePermission('funcionarios:escrever'), FuncionarioController.updateComissao);
router.delete('/funcionarios/:id', authenticate, authorizePermission('funcionarios:escrever'), FuncionarioController.deleteFuncionario);

export default router;
