import { useState } from "react";
import { X, Scissors, Save, Edit2 } from "lucide-react";
import { createServico, updateServico, getApiError, getApiErrorField } from "../../../services/api.js";
import './ServicoModal.css'

function ServicoModal({ onclose, servico = null, onSuccess }) {
    const isEdit = !!servico;

    const [formData, setFormData] = useState({
        nome: servico ? servico.nome : "",
        valor: servico ? servico.valor : "",
        categoria_id: servico ? servico.categoria_id : "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
        if (!formData.valor || formData.valor <= 0) erros.valor = "O valor deve ser maior que zero";
        if (!formData.categoria_id) erros.categoria_id = "A categoria e obrigatoria";
        setErrors(erros);
        return Object.keys(erros).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            const payload = {
                nome: formData.nome.trim(),
                valor: parseInt(formData.valor, 10),
                categoria_id: parseInt(formData.categoria_id, 10),
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

                        <div className="form-group">
                            <p>
                                <span className="currency">MT</span>
                                <span>Valor (preco)</span>
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
                                aria-describedby={errors.valor ? "valor-erro" : undefined}
                                required
                                min="0"
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
                                <span>Categoria</span>
                            </p>
                            <input
                                type="text"
                                name="categoria_id"
                                id="categoria_id"
                                placeholder="ID da categoria do servico"
                                value={formData.categoria_id}
                                onChange={(e) => handleChange("categoria_id", e.target.value)}
                                className={errors.categoria_id ? "input-invalido" : ""}
                                aria-invalid={errors.categoria_id ? "true" : undefined}
                                aria-describedby={errors.categoria_id ? "categoria_id-erro" : undefined}
                                required
                            />
                            {errors.categoria_id && (
                                <span className="field-error" id="categoria_id-erro" role="alert">
                                    {errors.categoria_id}
                                </span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            onClick={(e) => e.stopPropagation()}
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