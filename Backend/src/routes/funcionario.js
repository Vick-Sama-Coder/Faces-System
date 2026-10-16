import express from 'express';
import FuncionarioController from '../controller/funcionario.js';
import { authenticate, authorize } from '../middlewares/auth.js';



const router = express.Router();


//Rotas de todos os funcionarios
router.get('/funcionarios', authenticate, FuncionarioController.getFuncionarios);
router.get('/funcionario/:id', authenticate, FuncionarioController.getFuncionarioById);
router.post('/funcionario', authenticate, authorize('Administrador'), FuncionarioController.createFuncionario);
router.put('/funcionario/:id',authenticate, authorize('Administrador'), FuncionarioController.updateFuncionario);
router.delete('/funcionario/:id',authenticate, authorize('Administrador'), FuncionarioController.deleteFuncionario);

export default router;