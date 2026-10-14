// Conexão com o Supabase da JMC (Easypanel, projeto jmc, serviço supabase: variáveis
// SUPABASE_PUBLIC_URL e ANON_KEY).
// A anon key é pública por natureza; quem protege os dados são as regras em supabase/schema.sql.
// NUNCA coloque aqui a service_role key.
// Enquanto url estiver vazio, a página mostra que o login ainda não foi configurado.
export const supabaseConfig = {
  url: 'https://supabase.jmctecnologia.com.br',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyMDAxMzUxLCJleHAiOjIxMDczNjEzNTF9.kI-TymjGwYaPzgwKSFc-j_1_EcOJEKYBUO5n3d5quwQ',
};

// Provedores de login ativos no Supabase. Os botões dos outros ficam ocultos.
// Para ligar a Microsoft depois, use ['google', 'microsoft'] e ative o provedor "azure" no Supabase.
export const loginProviders = ['google'];
