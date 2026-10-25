import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { movimentoEstoque, produto } from '../db/schema/index.js';

// Listar movimentos de stock com filtros opcionais
const findAll = async ({ produto_id, tipo, data_inicio, data_fim, registado_por } = {}) => {
    const condicoes = [];

    if (produto_id) condicoes.push(eq(movimentoEstoque.produto_id, produto_id));
    if (tipo && tipo !== 'todos') condicoes.push(eq(movimentoEstoque.tipo, tipo));
    if (data_inicio) condicoes.push(sql`${movimentoEstoque.data_movimento} >= ${data_inicio}`);
    if (data_fim) condicoes.push(sql`${movimentoEstoque.data_movimento} <= ${data_fim}`);
    if (registado_por) condicoes.push(eq(movimentoEstoque.registado_por, registado_por));

    return db.select({
        id: movimentoEstoque.id,
        produto_id: movimentoEstoque.produto_id,
        produto_nome: produto.nome,
        tipo: movimentoEstoque.tipo,
        quantidade: movimentoEstoque.quantidade,
        motivo: movimentoEstoque.motivo,
        data_movimento: movimentoEstoque.data_movimento,
        registado_por: movimentoEstoque.registado_por,
        despesa_id: movimentoEstoque.despesa_id,
        created_at: movimentoEstoque.created_at
    })
        .from(movimentoEstoque)
        .leftJoin(produto, eq(produto.id, movimentoEstoque.produto_id))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(asc(movimentoEstoque.data_movimento), asc(movimentoEstoque.id));
};

// Registar um novo movimento de stock
const insert = async (tx, {
    produto_id,
    tipo,
    quantidade,
    motivo,
    data_movimento,
    registado_por,
    despesa_id
}) => {
    const [linha] = await tx.insert(movimentoEstoque).values({
        produto_id,
        tipo,
        quantidade,
        motivo: motivo ?? null,
        data_movimento: data_movimento ?? sql`current_date`,
        registado_por,
        despesa_id: despesa_id ?? null,
        created_at: sql`now()`
    })
        .returning({
            id: movimentoEstoque.id,
            produto_id: movimentoEstoque.produto_id,
            tipo: movimentoEstoque.tipo,
            quantidade: movimentoEstoque.quantidade,
            motivo: movimentoEstoque.motivo,
            data_movimento: movimentoEstoque.data_movimento,
            registado_por: movimentoEstoque.registado_por,
            despesa_id: movimentoEstoque.despesa_id,
            created_at: movimentoEstoque.created_at
        });

    return linha || null;
};

// Calcular stock atual a partir da fórmula:
// Stock atual = Stock inicial + Entradas - Saídas + Ajustes
// Considerando que:
// - Entradas sao movimentos do tipo 'entrada'
// - Saidas registadas sao movimentos do tipo 'saida'
// - Ajustes sao movimentos do tipo 'ajuste' (positivo ou negativo)
const calcularStockAtual = async (produtoId) => {
    const [linha] = await db.select({
        stock_minimo: produto.stock_minimo,
        total_entradas: sql`coalesce(sum(case when ${movimentoEstoque.tipo} = 'entrada' then ${movimentoEstoque.quantidade} else 0 end), 0)`,
        total_saidas: sql`coalesce(sum(case when ${movimentoEstoque.tipo} = 'saida' then ${movimentoEstoque.quantidade} else 0 end), 0)`,
        total_ajustes: sql`coalesce(sum(case when ${movimentoEstoque.tipo} = 'ajuste' then ${movimentoEstoque.quantidade} else 0 end), 0)`
    })
        .from(movimentoEstoque)
        .leftJoin(produto, eq(produto.id, movimentoEstoque.produto_id))
        .where(eq(movimentoEstoque.produto_id, produtoId));

    const totalEntradas = Number(linha.total_entradas);
    const totalSaidas = Number(linha.total_saidas);
    const totalAjustes = Number(linha.total_ajustes);

    return {
        stock_minimo: Number(linha.stock_minimo),
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        total_ajustes: totalAjustes,
        nota: "Stock calculado com base em movimentos. O stock inicial real deve ser guardado separadamente se necessario."
    };
};

const MovimientoEstoque = {
    findAll,
    insert,
    calcularStockAtual
};

export default MovimientoEstoque;
