import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import ProdutoController from '../controller/produto.js';

const router = express.Router();

// Leitura para qualquer utilizador autenticado; escrita exige a permissao de
// stock, tal como os movimentos de entrada/saida/ajuste.
router.get('/produtos', authenticate, ProdutoController.getProdutos);
router.get('/produtos/:id', authenticate, ProdutoController.getProdutoById);
router.post('/produtos', authenticate, authorizePermission('estoque:escrever'), ProdutoController.createProduto);
router.put('/produtos/:id', authenticate, authorizePermission('estoque:escrever'), ProdutoController.updateProduto);
router.delete('/produtos/:id', authenticate, authorizePermission('estoque:escrever'), ProdutoController.deleteProduto);

router.get('/categorias-produto', authenticate, ProdutoController.getCategoriasProduto);
router.post('/categorias-produto', authenticate, authorizePermission('estoque:escrever'), ProdutoController.createCategoriaProduto);
router.put('/categorias-produto/:id', authenticate, authorizePermission('estoque:escrever'), ProdutoController.updateCategoriaProduto);
router.delete('/categorias-produto/:id', authenticate, authorizePermission('estoque:escrever'), ProdutoController.deleteCategoriaProduto);

export default router;
