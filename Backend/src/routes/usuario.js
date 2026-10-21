import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import UsuarioController from '../controller/usuario.js';

const router = express.Router();

//Gestao de contas: requer a permissao "contas:gerir" (Administrador, por padrao)
router.get('/usuarios', authenticate, authorizePermission('contas:gerir'), UsuarioController.getUsuarios);
router.get('/usuarios/:id', authenticate, authorizePermission('contas:gerir'), UsuarioController.getUsuarioById);
router.post('/usuarios', authenticate, authorizePermission('contas:gerir'), UsuarioController.createUsuario);
router.put('/usuarios/:id', authenticate, authorizePermission('contas:gerir'), UsuarioController.updateUsuario);
router.patch('/usuarios/:id/estado', authenticate, authorizePermission('contas:gerir'), UsuarioController.updateEstadoUsuario);
router.post('/usuarios/:id/repor-senha', authenticate, authorizePermission('contas:gerir'), UsuarioController.reporSenha);
router.get('/usuarios/:id/permissoes', authenticate, authorizePermission('contas:gerir'), UsuarioController.getPermissoesUsuario);
router.put('/usuarios/:id/permissoes', authenticate, authorizePermission('contas:gerir'), UsuarioController.updatePermissoesUsuario);

export default router;
