// Configuração do app Web do Firebase (Console do Firebase > Configurações do projeto > Seus apps).
// Estes valores identificam o projeto e podem ficar públicos; quem protege os dados são as regras do Firebase.
// Enquanto apiKey estiver vazio, a página mostra que o login ainda não foi configurado.
export const firebaseConfig = {
  apiKey: 'AIzaSyBR7pouPetJp8odEoUALAlhznNtW9iAmA4',
  authDomain: 'jmctecnologia-e2d51.firebaseapp.com',
  projectId: 'jmctecnologia-e2d51',
  appId: '1:232227490953:web:58bcd68cace19eb4e6ca58',
};

// Provedores de login ativos no Firebase. Os botões dos outros ficam ocultos.
// Para ligar a Microsoft depois, use ['google', 'microsoft'].
export const loginProviders = ['google'];
