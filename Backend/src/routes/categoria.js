import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import CategoriaController from '../controller/categoria.js';



const router = express.Router();


//Rotas das categorias de salao (gestao exigida pela permissao de servicos)
router.get('/categorias', authenticate, CategoriaController.getCategorias);
router.get('/categorias/:id', authenticate, CategoriaController.getCategoriaById);
router.post('/categorias', authenticate, authorizePermission('servicos:escrever'), CategoriaController.createCategoria);
router.put('/categorias/:id', authenticate, authorizePermission('servicos:escrever'), CategoriaController.updateCategoria);
router.delete('/categorias/:id', authenticate, authorizePermission('servicos:escrever'), CategoriaController.deleteCategoria);

export default router;