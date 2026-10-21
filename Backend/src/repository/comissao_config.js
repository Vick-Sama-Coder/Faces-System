import pool from '../config/database.js';

const campos = `cc.id, cc.funcionario_id, cc.servico_id, s.nome as servico_nome,
    cc.taxa_percentual::float8 as taxa_percentual,
    to_char(cc.vigencia_inicio, 'YYYY-MM-DD') as vigencia_inicio,
    to_char(cc.vigencia_fim, 'YYYY-MM-DD') as vigencia_fim,
    cc.estado`;

//configuracao de comissao de um funcionario (geral + especificas por servico)
const findByFuncionario = async (funcionario_id) => {
    const result = await pool.query(
        `select ${campos}
           from comissao_config cc
           left join servico s on s.id = cc.servico_id
          where cc.funcionario_id = $1
          order by cc.servico_id nulls first`,
        [funcionario_id]
    );

    return result.rows;
};

//substitui toda a configuracao do funcionario (transacao: apaga e reinsere)
const substituir = async (funcionario_id, configs) => {
    const client = await pool.connect();

    try {
        await client.query('begin');
        await client.query('delete from comissao_config where funcionario_id = $1', [funcionario_id]);

        for (const config of configs) {
            await client.query(
                `insert into comissao_config
                    (funcionario_id, servico_id, taxa_percentual, vigencia_inicio, vigencia_fim)
                 values ($1, $2, $3, coalesce($4, current_date), $5)`,
                [
                    funcionario_id,
                    config.servico_id ?? null,
                    config.taxa_percentual,
                    config.vigencia_inicio ?? null,
                    config.vigencia_fim ?? null
                ]
            );
        }

        await client.query('commit');
    } catch (error) {
        await client.query('rollback');
        throw error;
    } finally {
        client.release();
    }
};

const ComissaoConfig = {
    findByFuncionario,
    substituir
};

export default ComissaoConfig;
