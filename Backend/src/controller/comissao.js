import Comissao from "../repository/comissao.js";
import Funcionario from "../repository/funcionario.js";

//lista de comissoes com filtros (funcionario, periodo, estado)
const getComissoes = async (req, res, next) => {
    try {
        const { funcionario, de, ate, estado } = req.query;

        res.status(200).json(await Comissao.findAll({ funcionario, de, ate, estado }));
    } catch (error) {
        next(error);
    }
};

//comissoes de um funcionario: o proprio (conta ligada) ou quem tem "relatorios:ler"
const getComissoesFuncionario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const funcionario = await Funcionario.findById(id);

        if (!funcionario) {
            return res.status(404).json({ message: "Funcionario nao encontrado" });
        }

        const proprio = funcionario.id_usuario === req.user.id;
        const autorizado = proprio || (req.user.permissoes || []).includes("relatorios:ler");

        if (!autorizado) {
            return res.status(403).json({ message: "Acesso negado: apenas as suas comissoes" });
        }

        const { de, ate } = req.query;
        res.status(200).json(await Comissao.findAll({ funcionario: id, de, ate }));
    } catch (error) {
        next(error);
    }
};

const ComissaoController = {
    getComissoes,
    getComissoesFuncionario
};

export default ComissaoController;
