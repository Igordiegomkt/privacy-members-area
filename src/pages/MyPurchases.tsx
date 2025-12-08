import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { fetchUserPurchases, UserPurchaseWithProduct } from '../lib/marketplace';

const formatPrice = (cents: number | null | undefined) => {
  if (cents == null) return '';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const MyPurchases: React.FC = () => {
  const [purchases, setPurchases] = useState<UserPurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchUserPurchases();
      setPurchases(data);
      setLoading(false);
    };
    load();
  }, []);

  // 🔐 Garante que só lidamos com compras que realmente têm products
  const purchasesWithProduct = purchases.filter((p): p is UserPurchaseWithProduct & { products: NonNullable<UserPurchaseWithProduct['products']> } => p.products !== null);

  const vipPurchases = purchasesWithProduct.filter(
    (p) => p.products.is_base_membership === true
  );

  const packPurchases = purchasesWithProduct.filter(
    (p) => !p.products.is_base_membership && p.products.type === 'pack'
  );

  const singlePurchases = purchasesWithProduct.filter(
    (p) => !p.products.is_base_membership && p.products.type === 'single_media'
  );

  const handleOpenModel = (username?: string | null) => {
    if (!username) return;
    navigate(`/modelo/${username}`);
  };

  const handleOpenProduct = (productId?: string | null) => {
    if (!productId) return;
    navigate(`/produto/${productId}`);
  };

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Minhas Compras</h1>

        {loading && (
          <p className="text-privacy-text-secondary text-sm">Carregando suas compras...</p>
        )}

        {!loading && purchasesWithProduct.length === 0 && (
          <p className="text-privacy-text-secondary text-sm">
            Você ainda não possui compras confirmadas. Assim que um pagamento for aprovado, ele
            aparecerá aqui. 💸
          </p>
        )}

        {!loading && purchasesWithProduct.length > 0 && (
          <div className="space-y-8">
            {/* VIP / Assinaturas base */}
            {vipPurchases.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Perfis VIP</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {vipPurchases.map((p) => {
                    const product = p.products;
                    const model = product.models;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleOpenModel(model?.username)}
                        className="bg-privacy-surface rounded-lg overflow-hidden text-left group"
                      >
                        <div className="relative aspect-[3/4]">
                          {model?.avatar_url ? (
                            <img
                              src={model.avatar_url}
                              alt={model.name || 'Modelo'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-privacy-border flex items-center justify-center text-xs text-privacy-text-secondary">
                              Sem foto
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-sm font-semibold truncate">
                              VIP de {model?.name || 'Modelo'}
                            </p>
                            <p className="text-xs text-privacy-text-secondary truncate">
                              @{model?.username}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Packs */}
            {packPurchases.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Packs</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {packPurchases.map((p) => {
                    const product = p.products;
                    const model = product.models;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleOpenProduct(product.id)}
                        className="bg-privacy-surface rounded-lg overflow-hidden text-left group"
                      >
                        <div className="relative aspect-[3/4]">
                          {product.cover_thumbnail ? (
                            <img
                              src={product.cover_thumbnail}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-privacy-border flex items-center justify-center text-xs text-privacy-text-secondary">
                              Sem capa
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-sm font-semibold truncate">{product.name}</p>
                            {model && (
                              <p className="text-xs text-privacy-text-secondary truncate">
                                @{model.username}
                              </p>
                            )}
                            <p className="text-xs text-primary mt-1">
                              {formatPrice(product.price_cents)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Conteúdos avulsos */}
            {singlePurchases.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Conteúdos Avulsos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {singlePurchases.map((p) => {
                    const product = p.products;
                    const model = product.models;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleOpenProduct(product.id)}
                        className="bg-privacy-surface rounded-lg overflow-hidden text-left group"
                      >
                        <div className="relative aspect-[3/4]">
                          {product.cover_thumbnail ? (
                            <img
                              src={product.cover_thumbnail}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-privacy-border flex items-center justify-center text-xs text-privacy-text-secondary">
                              Sem capa
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-sm font-semibold truncate">{product.name}</p>
                            {model && (
                              <p className="text-xs text-privacy-text-secondary truncate">
                                @{model.username}
                              </p>
                            )}
                            <p className="text-xs text-primary mt-1">
                              {formatPrice(product.price_cents)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};