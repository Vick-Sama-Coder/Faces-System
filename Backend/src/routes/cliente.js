import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import ClienteController from '../controller/cliente.js';

const router = express.Router();

//Leitura para qualquer utilizador autenticado; escrita requer "clientes:escrever"
router.get('/clientes', authenticate, ClienteController.getClientes);
router.get('/clientes/:id', authenticate, ClienteController.getClienteById);
router.post('/clientes', authenticate, authorizePermission('clientes:escrever'), ClienteController.createCliente);
router.put('/clientes/:id', authenticate, authorizePermission('clientes:escrever'), ClienteController.updateCliente);
router.patch('/clientes/:id/estado', authenticate, authorizePermission('clientes:escrever'), ClienteController.updateEstadoCliente);
router.delete('/clientes/:id', authenticate, authorizePermission('clientes:escrever'), ClienteController.deleteCliente);

export default router;
