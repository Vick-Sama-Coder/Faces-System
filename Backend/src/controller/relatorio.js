import Relatorio from "../repository/relatorio.js";

//todos os relatorios partilham o mesmo contrato: filtro opcional de periodo
const responder = (consultar) => async (req, res, next) => {
    try {
        const { de, ate } = req.query;
        res.status(200).json(await consultar({ de, ate }));
    } catch (error) {
        next(error);
    }
};

const RelatorioController = {
    resumo: responder(Relatorio.resumo),
    caixa: responder(Relatorio.caixa),
    servicos: responder(Relatorio.servicos),
    funcionarios: responder(Relatorio.funcionarios),
    assiduidade: responder(Relatorio.assiduidade),
    clientes: responder(Relatorio.clientes),
    fidelizacao: responder(Relatorio.fidelizacao),
    anulacoes: responder(Relatorio.anulacoes),
    movimentos: responder(Relatorio.movimentos)
};

export default RelatorioController;
