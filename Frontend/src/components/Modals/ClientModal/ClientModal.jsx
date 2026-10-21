import { useState } from "react";
import { X, User, Phone, Edit2, Save } from "lucide-react";
import { createCliente, updateCliente, getApiError, getApiErrorField } from "../../../services/api.js";
import { validarCliente } from "../../../utils/validacoes.js";
import './ClientModal.css'

function ClientModal({ onclose, cliente = null, onSuccess }) {
    const isEdit = !!cliente;

    const [formData, setFormData] = useState({
        nome: cliente ? cliente.nome : "",
        apelido: cliente ? cliente.apelido : "",
        telefone: cliente ? cliente.telefone : "",
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
        const erros = validarCliente(formData);
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
            if (isEdit) {
                await updateCliente(cliente.id, formData);
            } else {
                await createCliente(formData);
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
                className="client-modal open"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="header-modal">
                    <p className="Modal-Icon">
                        <User />
                    </p>
                    <div className="header-text-modal">
                        <p className="headerer">
                            <strong>{isEdit ? "Editar Cliente" : "Novo Cliente"}</strong>
                            <span>{isEdit ? "Actualize os dados do cliente" : "Registe um novo cliente no sistema"}</span>
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
                                <User />
                                <span>Nome</span>
                            </p>
                            <input
                                type="text"
                                name="nome"
                                id="nome"
                                placeholder="Nome do cliente"
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
                                <User />
                                <span>Apelido</span>
                            </p>
                            <input
                                type="text"
                                name="apelido"
                                id="apelido"
                                placeholder="Apelido do cliente"
                                value={formData.apelido}
                                onChange={(e) => handleChange("apelido", e.target.value)}
                                className={errors.apelido ? "input-invalido" : ""}
                                aria-invalid={errors.apelido ? "true" : undefined}
                                aria-describedby={errors.apelido ? "apelido-erro" : undefined}
                                required
                            />
                            {errors.apelido && (
                                <span className="field-error" id="apelido-erro" role="alert">
                                    {errors.apelido}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <p>
                                <Phone />
                                <span>Telefone</span>
                            </p>
                            <input
                                type="tel"
                                name="telefone"
                                id="telefone"
                                placeholder="Ex.: 84 123 4567"
                                value={formData.telefone}
                                onChange={(e) => handleChange("telefone", e.target.value)}
                                className={errors.telefone ? "input-invalido" : ""}
                                aria-invalid={errors.telefone ? "true" : undefined}
                                aria-describedby={errors.telefone ? "telefone-erro" : undefined}
                                required
                                maxLength={20}
                            />
                            {errors.telefone && (
                                <span className="field-error" id="telefone-erro" role="alert">
                                    {errors.telefone}
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
                            {loading ? "A guardar..." : isEdit ? "Actualizar Cliente" : "Registar Cliente"}
                        </button>
                    </form>
                </section>
            </section>
        </div>
    );
}

export default ClientModal;
