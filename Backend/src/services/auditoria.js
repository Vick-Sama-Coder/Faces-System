import db from '../db/client.js';
import Auditoria from '../repository/auditoria.js';

//Regista uma operacao auditavel. Deve ser chamado DENTRO da transacao da operacao
//(passando o tx) para o registo ser atomico com a alteracao; fora de
//transacao (controller) usa o db por omissao.
const registar = async (
    { id_utilizador, entidade, id_registo, operacao, antes, depois, motivo, identificador_operacao },
    executor = db
) => {
    await Auditoria.insert(executor, {
        id_utilizador,
        entidade,
        id_registo_afetado: id_registo,
        tipo_operacao: operacao,
        valores_anteriores: antes,
        valores_posteriores: depois,
        motivo,
        identificador_operacao
    });
};

const AuditoriaService = {
    registar
};

export default AuditoriaService;
