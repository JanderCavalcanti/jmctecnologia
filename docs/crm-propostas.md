# Mini CRM da Área do cliente: cadastro e status das propostas

O cliente entra na Área do cliente com o Google. No primeiro acesso ele preenche o cadastro: CPF ou CNPJ
(com máscara e validação), nome completo ou razão social, nome para contato (já vem com o nome da conta
Google), telefone e endereço (logradouro, bairro, cidade e estado vêm do CEP pelo ViaCEP). Depois ele pode
corrigir em **Meus dados**.

Em seguida ele vê as propostas ligadas ao e-mail dele, cada uma (um serviço) com a pipeline
**Proposta comercial → NDA → Contrato assinado** e a data de cada etapa.

Quem entra com um e-mail da tabela `admins` vê o **Painel JMC** e não passa pelo cadastro.
Instalação do Supabase em [`supabase-easypanel.md`](supabase-easypanel.md).

## Usar no dia a dia
1. Entre na Área do cliente com o e-mail de administrador. Aparece o **Painel JMC**.
2. Cadastre a proposta com o **e-mail que o cliente usa no login Google**, a empresa e o título.
   Ela começa em *Proposta comercial*, com a data de hoje.
3. Quando o NDA ou o contrato avançar, mude a etapa no seletor. O banco registra a data sozinho;
   voltar uma etapa apaga as datas das etapas seguintes.
4. O cliente vê a mudança na hora, sem recarregar a página.

Os cadastros dos clientes ficam na tabela `clientes` (Studio → **Table Editor**).

## Tabela `propostas`
| Coluna | Exemplo | Observação |
|---|---|---|
| `cliente_email` | `cliente@empresa.com` | minúsculo, o mesmo do login |
| `empresa` | `Empresa X` | |
| `titulo` | `Sistema de gestão de estoque` | |
| `observacao` | `Aguardando assinatura do jurídico` | opcional, aparece para o cliente |
| `etapa` | `0`, `1` ou `2` | 0 = Proposta comercial, 1 = NDA, 2 = Contrato assinado |
| `data_proposta`, `data_nda`, `data_contrato` | | preenchidas pelo banco ao mudar a etapa |
