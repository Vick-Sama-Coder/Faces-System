import { asc, eq, sql } from 'drizzle-orm';
import db from '../db/client.js';
import { comissaoConfig, servico } from '../db/schema/index.js';

const campos = {
    id: comissaoConfig.id,
    funcionario_id: comissaoConfig.funcionario_id,
    servico_id: comissaoConfig.servico_id,
    servico_nome: servico.nome,
    taxa_percentual: sql`${comissaoConfig.taxa_percentual}::float8`,
    vigencia_inicio: sql`to_char(${comissaoConfig.vigencia_inicio}, 'YYYY-MM-DD')`,
    vigencia_fim: sql`to_char(${comissaoConfig.vigencia_fim}, 'YYYY-MM-DD')`,
    estado: comissaoConfig.estado
};

//configuracao de comissao de um funcionario (geral + especificas por servico)
const findByFuncionario = async (funcionario_id) => {
    return db.select(campos)
        .from(comissaoConfig)
        .leftJoin(servico, eq(servico.id, comissaoConfig.servico_id))
        .where(eq(comissaoConfig.funcionario_id, funcionario_id))
        .orderBy(sql`${comissaoConfig.servico_id} nulls first`);
};

//substitui toda a configuracao do funcionario (transacao: apaga e reinsere)
const substituir = async (funcionario_id, configs) => {
    await db.transaction(async (tx) => {
        await tx.delete(comissaoConfig)
            .where(eq(comissaoConfig.funcionario_id, funcionario_id));

        if (configs.length === 0) {
            return;
        }

        await tx.insert(comissaoConfig).values(
            configs.map((config) => ({
                funcionario_id,
                servico_id: config.servico_id ?? null,
                taxa_percentual: String(config.taxa_percentual),
                vigencia_inicio: config.vigencia_inicio ?? sql`current_date`,
                vigencia_fim: config.vigencia_fim ?? null
            }))
        );
    });
};

const ComissaoConfig = {
    findByFuncionario,
    substituir
};

export default ComissaoConfig;
