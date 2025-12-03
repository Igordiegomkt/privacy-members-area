import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Product, Model } from '../../types';
import { Dialog, DialogContent, DialogTrigger } from '../../components/ui/dialog';

const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ProductForm: React.FC<{ modelId: string; product?: Product; onSave: () => void }> = ({ modelId, product, onSave }) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', description: '', price_cents: 0, type: 'pack', is_base_membership: false, cover_thumbnail: '', ...product
  });
  const [loading, setLoading] = useState(false);
  const isEditing = !!product;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    // @ts-ignore
    const val = isCheckbox ? e.target.checked : name === 'price_cents' ? parseInt(value, 10) * 100 : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = { ...formData, model_id: modelId };

    // Business logic: ensure only one base membership per model
    if (payload.is_base_membership) {
      await supabase.from('products').update({ is_base_membership: false }).eq('model_id', modelId);
    }

    const { error } = isEditing
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload);

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      alert('Produto salvo com sucesso!');
      onSave();
    }
    setLoading(false);
  };
  
  const inputStyle = "w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Produto" className={inputStyle} required />
      <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descrição" className={inputStyle} />
      <input name="price_cents" type="number" value={formData.price_cents ? formData.price_cents / 100 : ''} onChange={handleChange} placeholder="Preço (ex: 49.90)" className={inputStyle} step="0.01" required />
      <select name="type" value={formData.type} onChange={handleChange} className={inputStyle}>
        <option value="pack">Pack</option>
        <option value="subscription">Assinatura</option>
        <option value="single_media">Mídia Avulsa</option>
      </select>
      <input name="cover_thumbnail" value={formData.cover_thumbnail} onChange={handleChange} placeholder="URL da Thumbnail" className={inputStyle} />
      <label className="flex items-center gap-2 text-white">
        <input type="checkbox" name="is_base_membership" checked={formData.is_base_membership} onChange={handleChange} />
        É a assinatura base desta modelo?
      </label>
      <button type="submit" disabled={loading} className="bg-primary text-black font-bold py-2 px-4 rounded w-full">
        {loading ? 'Salvando...' : 'Salvar Produto'}
      </button>
    </form>
  );
};

export const ManageProducts: React.FC = () => {
    const { id: modelId } = useParams<{ id: string }>();
    const [model, setModel] = useState<Model | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
      if (!modelId) return;
      setLoading(true);
      const [modelRes, productsRes] = await Promise.all([
        supabase.from('models').select('*').eq('id', modelId).single(),
        supabase.from('products').select('*').eq('model_id', modelId).order('created_at')
      ]);
      if (modelRes.data) setModel(modelRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      setLoading(false);
    }, [modelId]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    const handleSave = () => {
      setIsModalOpen(false);
      fetchData();
    };

    if (loading) return <p>Carregando...</p>;
    if (!model) return <p>Modelo não encontrada.</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Produtos</h1>
            <p className="text-lg text-privacy-text-secondary mb-6">Modelo: <span className="text-primary">{model.name}</span></p>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <button className="bg-primary text-black font-bold py-2 px-4 rounded mb-6">Novo Produto</button>
              </DialogTrigger>
              <DialogContent>
                <h2 className="text-lg font-bold text-white mb-4">Novo Produto</h2>
                <ProductForm modelId={modelId!} onSave={handleSave} />
              </DialogContent>
            </Dialog>

            <div className="bg-privacy-surface rounded-lg shadow-lg overflow-hidden">
              <table className="w-full text-sm text-left text-privacy-text-secondary">
                <thead className="text-xs uppercase bg-privacy-border">
                  <tr>
                    <th className="px-6 py-3">Nome</th>
                    <th className="px-6 py-3">Preço</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Assinatura Base</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-b border-privacy-border">
                      <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                      <td className="px-6 py-4">{formatPrice(product.price_cents)}</td>
                      <td className="px-6 py-4 capitalize">{product.type}</td>
                      <td className="px-6 py-4">{product.is_base_membership ? 'Sim' : 'Não'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to="/admin/modelos" className="text-primary mt-4 inline-block">Voltar para Modelos</Link>
        </div>
    );
}