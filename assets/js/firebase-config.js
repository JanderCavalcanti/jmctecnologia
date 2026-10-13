// Configuração do app Web do Firebase (Console do Firebase > Configurações do projeto > Seus apps).
// Estes valores identificam o projeto e podem ficar públicos; quem protege os dados são as regras do Firebase.
// Enquanto apiKey estiver vazio, a página mostra que o login ainda não foi configurado.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
};

// Provedores de login ativos no Firebase. Os botões dos outros ficam ocultos.
// Para ligar a Microsoft depois, use ['google', 'microsoft'].
export const loginProviders = ['google'];
