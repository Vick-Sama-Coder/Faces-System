import { and, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { comissao, funcionario } from '../db/schema/index.js';

const campos = {
    id: comissao.id,
    atendimento_servico_id: comissao.atendimento_servico_id,
    funcionario_id: comissao.funcionario_id,
    funcionario_nome: funcionario.nome,
    taxa: sql`${comissao.taxa}::float8`,
    base_calculo: comissao.base_calculo,
    valor_comissao: comissao.valor_comissao,
    estado: comissao.estado,
    criado_em: comissao.criado_em
};

//listagem com filtros opcionais (funcionario, periodo, estado)
const findAll = async ({ funcionario: funcionarioId, de, ate, estado } = {}) => {
    const condicoes = [];

    if (funcionarioId !== undefined && funcionarioId !== null && funcionarioId !== '') {
        condicoes.push(eq(comissao.funcionario_id, funcionarioId));
    }
    if (de) condicoes.push(sql`${comissao.criado_em}::date >= ${de}`);
    if (ate) condicoes.push(sql`${comissao.criado_em}::date <= ${ate}`);
    if (estado !== undefined && estado !== null && estado !== '') {
        condicoes.push(eq(comissao.estado, estado));
    }

    return db.select(campos)
        .from(comissao)
        .innerJoin(funcionario, eq(funcionario.id, comissao.funcionario_id))
        .where(condicoes.length > 0 ? and(...condicoes) : undefined)
        .orderBy(sql`${comissao.criado_em} desc`);
};

//gera a comissao de cada servico do atendimento que ainda nao tenha comissao.
//a taxa especifica por servico sobrepoe-se a geral do funcionario (RN27);
//o "on conflict do nothing" garante idempotencia (no maximo uma por servico).
const gerarParaAtendimento = async (tx, atendimento_id) => {
    await tx.execute(sql`
        insert into comissao (atendimento_servico_id, funcionario_id, taxa, base_calculo, valor_comissao)
        select s.id,
               s.funcionario_id,
               coalesce(cc.taxa_percentual, f.comissao_percentual),
               s.valor_final,
               round(s.valor_final * coalesce(cc.taxa_percentual, f.comissao_percentual) / 100)::int
          from atendimento_servico s
          join funcionario f on f.id = s.funcionario_id
          left join lateral (
               select c.taxa_percentual
                 from comissao_config c
                where c.funcionario_id = s.funcionario_id
                  and c.servico_id = s.servico_id
                  and c.estado = 'Ativo'
                order by c.vigencia_inicio desc
                limit 1
          ) cc on true
         where s.atendimento_id = ${atendimento_id} and s.estado = 'Ativo'
        on conflict (atendimento_servico_id) do nothing
    `);
};

const Comissao = {
    findAll,
    gerarParaAtendimento
};

export default Comissao;
