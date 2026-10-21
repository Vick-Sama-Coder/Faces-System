import Relatorio from "../repository/relatorio.js";

//partilhar o mesmo contrato de periodo evita repetir o tratamento do filtro em cada relatorio
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
