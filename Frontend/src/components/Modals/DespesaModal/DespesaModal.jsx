import { useState, useEffect } from "react";
import { X, Receipt, Edit2, Save, Calendar, CreditCard, FileText, Tag } from "lucide-react";
import {
    createDespesa,
    updateDespesa,
    getCategoriasDespesa,
    getApiError,
    getApiErrorField
} from "../../../services/api.js";
import './DespesaModal.css'

function dataHoje() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function DespesaModal({ onclose, despesa = null, onSuccess }) {
    const isEdit = !!despesa;

    const [formData, setFormData] = useState({
        descricao: despesa ? (despesa.descricao ?? "") : "",
        categoria_id: despesa ? String(despesa.categoria_id || "") : "",
        valor_total: despesa ? String(despesa.valor_total || "") : "",
        data_compra: despesa ? String(despesa.data_compra || "").slice(0, 10) : dataHoje(),
        metodo_pagamento: despesa ? despesa.metodo_pagamento : "Dinheiro",
        comprovativo: despesa ? (despesa.comprovativo ?? "") : ""
    });

    const [categorias, setCategorias] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const FORMAS_PAGAMENTO = ["Dinheiro", "M-Pesa", "e-Mola", "Cartao", "Transferencia", "Outro"];

    useEffect(() => {
        let activo = true;
        async function carregar() {
            try {
                const res = await getCategoriasDespesa();
                if (!activo) return;
                setCategorias(Array.isArray(res.data) ? res.data : (res.data?.categorias || []));
            } catch {
                // sem categorias: a despesa pode ser registada sem categoria
            }
        }
        carregar();
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
        if (!formData.descricao?.trim()) erros.descricao = "A descricao e obrigatoria";
        if (!formData.valor_total || Number(formData.valor_total) <= 0) erros.valor_total = "O valor deve ser maior que zero";
        if (!formData.data_compra) erros.data_compra = "Indique a data da despesa";
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
                descricao: formData.descricao?.trim() || "",
                categoria_id: formData.categoria_id ? Number.parseInt(formData.categoria_id, 10) : null,
                valor_total: Number.parseInt(formData.valor_total, 10),
                data_compra: formData.data_compra,
                metodo_pagamento: formData.metodo_pagamento,
                comprovativo: formData.comprovativo?.trim() || null
            };

            if (isEdit) {
                await updateDespesa(despesa.id, payload);
            } else {
                await createDespesa(payload);
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
            <section className="despesa-modal open" onClick={(e) => e.stopPropagation()}>
                <header className="header-modal">
                    <p className="Modal-Icon"><Receipt /></p>
                    <div className="header-text-modal">
                        <p className="headerer">
                            <strong>{isEdit ? "Editar Despesa" : "Nova Despesa"}</strong>
                            <span>{isEdit ? "Actualize os dados da despesa" : "Registe uma nova despesa operacional"}</span>
                        </p>
                    </div>
                    <p className="plusIcon"><X onClick={onclose} /></p>
                </header>

                {error && <div className="error-banner"><span>{error}</span></div>}

                <section className="main-content">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <p><Receipt /><span>Descricao</span></p>
                            <input type="text" name="descricao" id="descricao" placeholder="Ex.: Compra de produtos de limpeza" value={formData.descricao} onChange={(e) => handleChange("descricao", e.target.value)} className={errors.descricao ? "input-invalido" : ""} aria-invalid={errors.descricao ? "true" : undefined} aria-describedby={errors.descricao ? "descricao-erro" : undefined} required maxLength={255} />
                            {errors.descricao && <span className="field-error" id="descricao-erro" role="alert">{errors.descricao}</span>}
                        </div>

                        <div className="form-group">
                            <p><Tag /><span>Categoria</span></p>
                            <select name="categoria_id" id="categoria_id" value={formData.categoria_id} onChange={(e) => handleChange("categoria_id", e.target.value)} className={errors.categoria_id ? "input-invalido" : ""} aria-invalid={errors.categoria_id ? "true" : undefined}>
                                <option value="">Sem categoria</option>
                                {categorias.map((categoria) => (<option key={categoria.id} value={categoria.id}>{categoria.nome}</option>))}
                            </select>
                        </div>

                        <div className="form-grid-duo">
                            <div className="form-group">
                                <p><CreditCard /><span>Valor (MT)</span></p>
                                <input type="number" name="valor_total" id="valor_total" placeholder="0" value={formData.valor_total} onChange={(e) => handleChange("valor_total", e.target.value)} className={errors.valor_total ? "input-invalido" : ""} aria-invalid={errors.valor_total ? "true" : undefined} aria-describedby={errors.valor_total ? "valor_total-erro" : undefined} required min="1" step="1" />
                                {errors.valor_total && <span className="field-error" id="valor_total-erro" role="alert">{errors.valor_total}</span>}
                            </div>
                            <div className="form-group">
                                <p><Calendar /><span>Data da despesa</span></p>
                                <input type="date" name="data_compra" id="data_compra" value={formData.data_compra} onChange={(e) => handleChange("data_compra", e.target.value)} className={errors.data_compra ? "input-invalido" : ""} aria-invalid={errors.data_compra ? "true" : undefined} aria-describedby={errors.data_compra ? "data_compra-erro" : undefined} required />
                                {errors.data_compra && <span className="field-error" id="data_compra-erro" role="alert">{errors.data_compra}</span>}
                            </div>
                        </div>

                        <div className="form-grid-duo">
                            <div className="form-group">
                                <p><FileText /><span>Metodo de pagamento</span></p>
                                <select name="metodo_pagamento" id="metodo_pagamento" value={formData.metodo_pagamento} onChange={(e) => handleChange("metodo_pagamento", e.target.value)} className={errors.metodo_pagamento ? "input-invalido" : ""}>
                                    {FORMAS_PAGAMENTO.map((forma) => (<option key={forma} value={forma}>{forma}</option>))}
                                </select>
                            </div>
                            <div className="form-group">
                                <p><FileText /><span>Comprovativo (opcional)</span></p>
                                <input type="text" name="comprovativo" id="comprovativo" placeholder="Numero de fatura ou recibo" value={formData.comprovativo} onChange={(e) => handleChange("comprovativo", e.target.value)} className={errors.comprovativo ? "input-invalido" : ""} maxLength={255} />
                                {errors.comprovativo && <span className="field-error" id="comprovativo-erro" role="alert">{errors.comprovativo}</span>}
                            </div>
                        </div>

                        <button type="submit" className="submit-btn" onClick={(e) => e.stopPropagation()} disabled={loading}>
                            <span className="btn-icon">{isEdit ? <Edit2 /> : <Save />}</span>
                            {loading ? "A guardar..." : isEdit ? "Actualizar Despesa" : "Registar Despesa"}
                        </button>
                    </form>
                </section>
            </section>
        </div>
    );
}
export default DespesaModal