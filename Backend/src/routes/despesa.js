import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import DespesaController from '../controller/despesa.js';
import CategoriaDespesaController from '../controller/categoria_despesa.js';

const router = express.Router();

//Leitura para qualquer utilizador autenticado; escrita requer "despesas:escrever"
router.get('/despesas', authenticate, DespesaController.getDespesas);
router.get('/despesas/:id', authenticate, DespesaController.getDespesaById);
router.post('/despesas', authenticate, authorizePermission('despesas:escrever'), DespesaController.createDespesa);
router.put('/despesas/:id', authenticate, authorizePermission('despesas:escrever'), DespesaController.updateDespesa);
router.delete('/despesas/:id', authenticate, authorizePermission('despesas:escrever'), DespesaController.deleteDespesa);

//categorias de despesa
router.get('/categorias-despesa', authenticate, CategoriaDespesaController.getCategoriasDespesa);
router.post('/categorias-despesa', authenticate, authorizePermission('despesas:escrever'), CategoriaDespesaController.createCategoriaDespesa);

export default router;
