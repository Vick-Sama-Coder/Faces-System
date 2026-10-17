import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import SalarioController from '../controller/salario.js';

const router = express.Router();

//Gestao do processamento salarial (Administrador e Financeiro)
router.get('/salarios/processamentos', authenticate, authorizePermission('salarios:gerir'), SalarioController.getProcessamentos);
router.get('/salarios/processamentos/:id', authenticate, authorizePermission('salarios:gerir'), SalarioController.getProcessamentoById);
router.post('/salarios/processar', authenticate, authorizePermission('salarios:gerir'), SalarioController.processar);
router.put('/salarios/processamentos/:id/deducoes', authenticate, authorizePermission('salarios:gerir'), SalarioController.atualizarDeducoes);
//A aprovacao exige "salarios:aprovar" (RF19)
router.patch('/salarios/processamentos/:id/aprovar', authenticate, authorizePermission('salarios:aprovar'), SalarioController.aprovar);
router.patch('/salarios/processamentos/:id/pagar', authenticate, authorizePermission('salarios:gerir'), SalarioController.pagar);

export default router;
