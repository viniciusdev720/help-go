Quero corrigir o sistema de cadastro e login do HelpGo para que os dados dos usuários sejam realmente salvos no banco de dados do Supabase e utilizados posteriormente no login.

OBJETIVO:

Quando uma pessoa criar uma conta como CLIENTE ou PRESTADOR, os dados cadastrados devem ser enviados e salvos corretamente no Supabase.

Depois, essa mesma pessoa deve conseguir fazer login utilizando as credenciais cadastradas.

==================================================
CLIENTE
==================================================

No cadastro de cliente:

1. Criar a conta utilizando o Supabase Auth.
2. Salvar os dados do cliente na tabela correspondente do banco.
3. Associar o registro ao UUID gerado pelo Supabase Auth.
4. Salvar corretamente os campos existentes no formulário, como:
   - nome
   - email
   - telefone
   - CPF
   - endereço
   - demais dados que já existirem no formulário.

Não criar dados fictícios.

==================================================
PRESTADOR
==================================================

No cadastro de prestador:

1. Criar a conta utilizando o Supabase Auth.
2. Salvar os dados do prestador no banco.
3. Associar o prestador ao mesmo UUID da conta criada no Supabase Auth.
4. Salvar corretamente:
   - nome
   - email
   - telefone/WhatsApp
   - CPF
   - endereço
   - bio/descrição
   - preço
   - foto, caso exista
   - serviços selecionados
   - demais dados existentes no formulário.

O prestador também deve conseguir fazer login posteriormente com a conta criada.

==================================================
LOGIN
==================================================

Quando o usuário fizer login:

1. Utilizar o Supabase Auth.
2. Verificar email e senha.
3. Recuperar o usuário autenticado.
4. Buscar os dados desse usuário no banco.
5. Identificar se ele é:
   - cliente
   - prestador
   - administrador.

Redirecionamento:

CLIENTE
→ tela principal do cliente

PRESTADOR
→ tela principal do prestador

ADMIN
→ admin.html

A conta administrativa é:

admin@helpgo.com

Não alterar o funcionamento do administrador já configurado.

==================================================
RELACIONAMENTO AUTH + BANCO
==================================================

É muito importante que o usuário criado no Supabase Auth tenha o mesmo UUID utilizado na tabela public.usuarios.

Não criar um UUID diferente manualmente.

Utilizar:

auth.users.id
↓
public.usuarios.id

E, para prestadores:

public.usuarios.id
↓
public.prestadores.id

Verifique a estrutura atual do banco antes de fazer alterações.

==================================================
SUPABASE
==================================================

Utilizar o novo projeto Supabase já configurado no projeto.

Não utilizar o Supabase antigo.

Não utilizar service_role ou secret key no frontend.

Utilizar o supabase.js já existente ou corrigi-lo caso esteja errado.

==================================================
IMPORTANTE
==================================================

Analise primeiro os arquivos atuais de:

- cadastro de cliente
- cadastro de prestador
- login
- supabase.js
- autenticação/Guard
- serviços
- prestadores
- banco/SQL

Não recrie o sistema inteiro.

Corrija o código existente.

Procure também por:

- dados que estão sendo salvos apenas no localStorage
- dados hardcoded
- formulários que não estão enviando os dados
- erros nas consultas Supabase
- tabelas ou colunas com nomes incorretos
- UUIDs incorretos
- código PHP antigo
- endpoints antigos
- problemas de RLS
- problemas de sessão.

==================================================
RESULTADO FINAL
==================================================

O sistema deve funcionar assim:

CADASTRO CLIENTE
↓
Supabase Auth cria a conta
↓
Dados são salvos no banco
↓
Cliente pode fazer login
↓
Sistema identifica CLIENTE
↓
Tela do cliente


CADASTRO PRESTADOR
↓
Supabase Auth cria a conta
↓
Dados são salvos no banco
↓
Prestador pode fazer login
↓
Sistema identifica PRESTADOR
↓
Tela do prestador


ADMIN
↓
Login com admin@helpgo.com
↓
admin.html

Depois de implementar, teste o fluxo completo e informe quais arquivos foram alterados e se alguma alteração SQL foi necessária.