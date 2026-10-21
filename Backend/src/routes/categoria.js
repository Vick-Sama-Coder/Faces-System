import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import CategoriaController from '../controller/categoria.js';



const router = express.Router();


//Rotas das categorias de salao (gestao: so Administrador)
router.get('/categorias', authenticate, CategoriaController.getCategorias);
router.get('/categorias/:id', authenticate, CategoriaController.getCategoriaById);
router.post('/categorias', authenticate, authorize('Administrador'), CategoriaController.createCategoria);
router.put('/categorias/:id', authenticate, authorize('Administrador'), CategoriaController.updateCategoria);
router.delete('/categorias/:id', authenticate, authorize('Administrador'), CategoriaController.deleteCategoria);

export default router;