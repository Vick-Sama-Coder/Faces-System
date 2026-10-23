import { useEffect, useState } from "react";
import { X, Scissors, Save, Edit2, Tag, Heart } from "lucide-react";
import { createServico, updateServico, getCategorias, getApiError, getApiErrorField } from "../../../services/api.js";
import './ServicoModal.css'

function ServicoModal({ onclose, servico = null, onSuccess }) {
    const isEdit = !!servico;

    const [formData, setFormData] = useState({
        nome: servico ? servico.nome : "",
        valor: servico ? servico.valor : "",
        categoria_id: servico ? String(servico.categoria_id) : ""
    });

    const [categorias, setCategorias] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let activo = true;

        async function carregarCategorias() {
            try {
                const res = await getCategorias();
                if (activo) setCategorias(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                if (activo) setError(getApiError(err));
            }
        }

        carregarCategorias();
        return () => { activo = false };
    }, []);

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field]) {
            setErrors({ ...errors, [field]: null });
        }
        if (error) setError(null);
    };

    const validate = () => {
        const erros = {};
        if (!formData.nome.trim()) erros.nome = "O nome do servico e obrigatorio";
        if (!formData.valor || Number(formData.valor) <= 0) erros.valor = "O valor deve ser maior que zero";
        if (!formData.categoria_id) erros.categoria_id = "A categoria e obrigatoria";
        setErrors(erros);
        return Object.keys(erros).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate() || loading) return;

        setLoading(true);
        setError(null);

        try {
            const payload = {
                nome: formData.nome.trim(),
                valor: Number.parseInt(formData.valor, 10),
                categoria_id: Number.parseInt(formData.categoria_id, 10)
            };

            if (isEdit) {
                await updateServico(servico.id, payload);
            } else {
                await createServico(payload);
            }
            setLoading(false);
            if (onSuccess) onSuccess();
            onclose();
        } catch (err) {
            setLoading(false);
            const field = getApiErrorField(err);
            const msg = getApiError(err);
            if (field) {
                setErrors({ ...errors, [field]: msg });
            } else {
                setError(msg);
            }
        }
    };

    return (
        <div className="modal-backdrop" onClick={onclose}>
            <section
                className="servico-modal open"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="header-modal">
                    <p className="Modal-Icon">
                        <Scissors />
                    </p>
                    <div className="header-text-modal">
                        <p className="headerer">
                            <strong>{isEdit ? "Editar Servico" : "Novo Servico"}</strong>
                            <span>{isEdit ? "Actualize os dados do servico" : "Registe um novo servico no sistema"}</span>
                        </p>
                    </div>
                    <p className="plusIcon"><X onClick={onclose} /></p>
                </header>

                {error && (
                    <div className="error-banner">
                        <span>{error}</span>
                    </div>
                )}

                <section className="main-content">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <p>
                                <Scissors />
                                <span>Nome do Servico</span>
                            </p>
                            <input
                                type="text"
                                name="nome"
                                id="nome"
                                placeholder="Ex.: Corte de Cabelo, Manicure, Penteado"
                                value={formData.nome}
                                onChange={(e) => handleChange("nome", e.target.value)}
                                className={errors.nome ? "input-invalido" : ""}
                                aria-invalid={errors.nome ? "true" : undefined}
                                aria-describedby={errors.nome ? "nome-erro" : undefined}
                                required
                            />
                            {errors.nome && (
                                <span className="field-error" id="nome-erro" role="alert">
                                    {errors.nome}
                                </span>
                            )}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <p>
                                    <span className="currency">MT</span>
                                    <span>Valor</span>
                                </p>
                                <input
                                    type="number"
                                    name="valor"
                                    id="valor"
                                    placeholder="Ex.: 250"
                                    value={formData.valor}
                                    onChange={(e) => handleChange("valor", e.target.value)}
                                    className={errors.valor ? "input-invalido" : ""}
                                    aria-invalid={errors.valor ? "true" : undefined}
                                    required
                                    min="1"
                                    step="1"
                                />
                                {errors.valor && (
                                    <span className="field-error" id="valor-erro" role="alert">
                                        {errors.valor}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <p>
                                    <Tag />
                                    <span>Categoria</span>
                                </p>
                                <select
                                    name="categoria_id"
                                    id="categoria_id"
                                    value={formData.categoria_id}
                                    onChange={(e) => handleChange("categoria_id", e.target.value)}
                                    className={errors.categoria_id ? "input-invalido" : ""}
                                    aria-invalid={errors.categoria_id ? "true" : undefined}
                                    required
                                >
                                    <option value="">Selecione a categoria...</option>
                                    {categorias.map((categoria) => (
                                        <option key={categoria.id} value={categoria.id}>
                                            {categoria.nome}
                                        </option>
                                    ))}
                                </select>
                                {errors.categoria_id && (
                                    <span className="field-error" id="categoria_id-erro" role="alert">
                                        {errors.categoria_id}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="servico-modal-note">
                            <Heart size={18} />
                            <span>
                                A fidelizacao e configurada no botao <strong>Eleger fidelizacao</strong> na pagina de servicos.
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            <span className="btn-icon">
                                {isEdit ? <Edit2 /> : <Save />}
                            </span>
                            {loading ? "A guardar..." : isEdit ? "Actualizar Servico" : "Registar Servico"}
                        </button>
                    </form>
                </section>
            </section>
        </div>
    );
}

export default ServicoModal;
