import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveUTMsToLocalStorage } from '../utils/utmParser';
import { registerFirstAccess } from '../lib/accessLogger';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { normalizePhone, synthesizeEmailFromPhone } from '../utils/phoneUtils';
import { ensureWelcomePurchaseForCarolina } from '../lib/welcomePurchase';

const FIXED_PASSWORD = '12345678'; // Senha fixa para todos os usuários

export const Login: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Verifica se já existe uma sessão Supabase ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/', { replace: true });
        return;
      }
      saveUTMsToLocalStorage();
    });
  }, [navigate]);

  const validateName = (fullName: string): boolean => {
    const words = fullName.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length >= 1; // Pelo menos um nome
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateName(name)) {
      setError('Por favor, informe seu nome.');
      return;
    }

    if (!isAdult) {
      setError('Você precisa confirmar que é maior de 18 anos.');
      return;
    }
    
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
        setError('Por favor, insira um número de WhatsApp válido (com DDD).');
        return;
    }
    
    const synthesizedEmail = synthesizeEmailFromPhone(normalizedPhone);

    setIsLoading(true);

    try {
      // 1. Tenta fazer login com email sintético
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: synthesizedEmail, // Usando email sintético
        password: FIXED_PASSWORD,
      });

      // 2. Se o usuário não existir, tenta cadastrar
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        
        // Tenta cadastrar
        const { error: signUpError } = await supabase.auth.signUp({
          email: synthesizedEmail, // Usando email sintético
          password: FIXED_PASSWORD,
          options: {
            data: {
              first_name: name.trim().split(' ')[0],
              last_name: name.trim().split(' ').slice(1).join(' ') || null,
              phone: normalizedPhone, // Armazenando o telefone real nos metadados
            },
          },
        });

        if (signUpError) {
          // Se o erro for que o usuário já existe (race condition), tenta login novamente
          if (signUpError.message.includes('User already exists')) {
            ({ data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: synthesizedEmail,
              password: FIXED_PASSWORD,
            }));
          } else {
            throw signUpError;
          }
        } else {
            // Cadastro bem-sucedido, tenta login novamente
            ({ data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: synthesizedEmail,
              password: FIXED_PASSWORD,
            }));
        }
      }
      
      if (signInError) throw signInError;
      
      const user = signInData.user;
      if (!user) throw new Error("Falha ao obter usuário após login/cadastro.");

      // 3. Pós-login: Garantir compra de boas-vindas e registrar acesso
      
      // O ID do usuário agora é o ID do Supabase Auth
      localStorage.setItem('userName', name.trim());
      localStorage.setItem('userIsAdult', isAdult.toString());
      
      // Garante que o usuário tenha acesso ao conteúdo base da Carolina
      await ensureWelcomePurchaseForCarolina(supabase, user.id);
      
      // Registra o primeiro acesso (para fins de analytics/tracking)
      await registerFirstAccess({
        name: name.trim(),
        isAdult,
        landingPage: window.location.href,
      });

      // Redireciona para a raiz. O ProtectedRouteUser agora usará a sessão Supabase.
      navigate('/', { replace: true });

    } catch (err: any) {
      console.error('Falha crítica no processo de autenticação:', err);
      setError(err.message || 'Ocorreu um erro inesperado. Tente novamente.');
      setIsLoading(false);
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

  return (
    <div className="min-h-screen bg-privacy-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Logo textSize="text-4xl" />
          <p className="text-privacy-text-secondary mt-2">Acesse com seu WhatsApp</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={inputStyle}
              placeholder="WhatsApp (DDD + Número)"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputStyle}
              placeholder="Seu nome"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
                className="w-5 h-5 bg-privacy-surface border-privacy-border rounded text-primary focus:ring-primary focus:ring-offset-privacy-black"
                disabled={isLoading}
              />
              <span className="text-sm text-privacy-text-secondary">
                Confirmo que sou maior de 18 anos.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isAdult || !name.trim() || !phone.trim()}
            className="w-full bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Acessando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-privacy-text-secondary">
            Ao continuar, você concorda com nossos Termos e Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
};