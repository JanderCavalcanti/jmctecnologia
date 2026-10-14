// Conexão com o Supabase da JMC (Easypanel). Supabase Studio > Project Settings > API, ou as
// variáveis SUPABASE_PUBLIC_URL e ANON_KEY do serviço no Easypanel.
// A anon key é pública por natureza; quem protege os dados são as regras em supabase/schema.sql.
// NUNCA coloque aqui a service_role key.
// Enquanto url estiver vazio, a página mostra que o login ainda não foi configurado.
export const supabaseConfig = {
  url: '',
  anonKey: '',
};

// Provedores de login ativos no Supabase. Os botões dos outros ficam ocultos.
// Para ligar a Microsoft depois, use ['google', 'microsoft'] e ative o provedor "azure" no Supabase.
export const loginProviders = ['google'];
