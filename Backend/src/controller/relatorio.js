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

//o relatorio financeiro identifica quem o gerou, para efeitos de auditoria
const financeiro = async (req, res, next) => {
    try {
        const { de, ate } = req.query;
        const dados = await Relatorio.financeiro({ de, ate });

        res.status(200).json({
            ...dados,
            gerado_por: req.user?.nome || "Sistema",
            gerado_em: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
};

const RelatorioController = {
    resumo: responder(Relatorio.resumo),
    financeiro,
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
