import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import MovimentoEstoqueService from '../services/movimento_estoque.js';

const router = express.Router();

// Leitura para qualquer utilizador autenticado; escrita requer "estoque:escrever"
router.get('/movimentos', authenticate, async (req, res, next) => {
    try {
        const movimentos = await MovimentoEstoqueService.listarMovimentos({
            produto_id: req.query.produto_id,
            tipo: req.query.tipo,
            data_inicio: req.query.data_inicio,
            data_fim: req.query.data_fim
        });
        res.status(200).json(movimentos);
    } catch (error) {
        next(error);
    }
});

router.get('/stock/:produto_id', authenticate, async (req, res, next) => {
    try {
        const stock = await MovimentoEstoqueService.getStockAtual(req.params.produto_id);
        res.status(200).json(stock);
    } catch (error) {
        next(error);
    }
});

router.post('/entrada', authenticate, authorizePermission('estoque:escrever'), async (req, res, next) => {
    try {
        const { produto_id, quantidade, motivo } = req.body;
        const registado_por = req.user.id;

        const movimento = await MovimentoEstoqueService.registrarEntrada({
            produto_id,
            quantidade,
            motivo,
            registado_por
        });

        res.status(201).json(movimento);
    } catch (error) {
        next(error);
    }
});

router.post('/saida', authenticate, authorizePermission('estoque:escrever'), async (req, res, next) => {
    try {
        const { produto_id, quantidade, motivo } = req.body;
        const registado_por = req.user.id;

        const movimento = await MovimentoEstoqueService.registrarSaida({
            produto_id,
            quantidade,
            motivo,
            registado_por
        });

        res.status(201).json(movimento);
    } catch (error) {
        next(error);
    }
});

router.post('/ajuste', authenticate, authorizePermission('estoque:escrever'), async (req, res, next) => {
    try {
        const { produto_id, quantidade, motivo } = req.body;
        const registado_por = req.user.id;

        const movimento = await MovimentoEstoqueService.registrarAjuste({
            produto_id,
            quantidade,
            motivo,
            registado_por
        });

        res.status(201).json(movimento);
    } catch (error) {
        next(error);
    }
});

export default router;