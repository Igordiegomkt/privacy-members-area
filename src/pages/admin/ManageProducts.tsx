import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Product, Model } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';

const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ProductFormProps {
    modelId: string;
    product?: Product;
    onSave: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ modelId, product, onSave }: ProductFormProps) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', description: '', price_cents: 0, type: 'pack', is_base_membership: false, cover_thumbnail: '', ...product
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!product;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? target.checked : name === 'price_cents' ? Math.round(parseFloat(value) * 100) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log('[ProductForm] Submitting product:', formData);

    const payload = { ...formData, model_id: modelId };
    let savedProductId: string | undefined;

    try {
      if (payload.is_base_membership) {
        console.log('[ProductForm] Setting other products as non-base membership for model:', modelId);
        // Ensure only one base membership exists
        const { error: updateError } = await supabase.from('products').update({ is_base_membership: false }).eq('model_id', modelId).neq('id', product?.id);
        if (updateError) throw updateError;
      }

      if (isEditing) {
        const { error: submissionError } = await supabase.from('products').update(payload).eq('id', product!.id);
        if (submissionError) throw submissionError;
        savedProductId = product!.id;
      } else {
        const { data: insertedProduct, error: submissionError } = await supabase.from('products').insert(payload).select('id').single();
        if (submissionError) throw submissionError;
        savedProductId = insertedProduct?.id;
      }
      
      // Broadcast notification if a new product was created or updated
      if (savedProductId) {
        const { data, error: broadcastError } = await supabase.functions.invoke('broadcast-new-product', {
            body: { productId: savedProductId },
        });

        if (broadcastError) {
            console.error('[Admin] broadcast-new-product error:', broadcastError);
        } else if (data && data.ok === false) {
            console.error('[Admin] broadcast-new-product failed:', data.message);
        } else {
            console.log('[Admin] Notificação broadcast disparada com sucesso.');
        }
      }

      alert('Produto salvo com sucesso!');
      onSave();
    } catch (err: any) {
      console.error('[ProductForm] Submission error:', err);
      setError(`Erro ao salvar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const inputStyle = "w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-md">{error}</p>}
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
        <input type="checkbox" name="is_base_membership" checked={!!formData.is_base_membership} onChange={handleChange} />
        É a assinatura base desta modelo?
      </label>
      <button type="submit" disabled={loading} className="bg-primary text-black font-bold py-2 px-4 rounded w-full disabled:opacity-50">
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

    const handleDelete = async (productId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (error) {
                alert(`Erro ao excluir: ${error.message}`);
            } else {
                alert('Produto excluído com sucesso.');
                setProducts(prev => prev.filter(p => p.id !== productId));
            }
        }
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
                <DialogHeader>
                  <DialogTitle>Novo Produto</DialogTitle>
                </DialogHeader>
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
                    <th className="px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-b border-privacy-border">
                      <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                      <td className="px-6 py-4">{formatPrice(product.price_cents)}</td>
                      <td className="px-6 py-4 capitalize">{product.type}</td>
                      <td className="px-6 py-4">{product.is_base_membership ? 'Sim' : 'Não'}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-400 font-medium">
                            Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link to="/admin/modelos" className="text-primary mt-4 inline-block">Voltar para Modelos</Link>
        </div>
    );
};