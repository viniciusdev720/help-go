# Separação de contas

## Estado e aplicação

`separar-perfis.sql` é uma migração preparada para o esquema usado pelo projeto.
Ela ainda precisa ser aplicada e validada no Supabase conectado. Não execute os
scripts antigos de criação como substitutos desta migração.

1. Conferir no projeto remoto as tabelas `usuarios`, `prestadores`, `admins`,
   `enderecos`, `servicos` e `prestador_servicos`, suas colunas e triggers de Auth.
2. Executar `separar-perfis.sql` no SQL Editor. O script usa uma transação.
3. Recarregar o site para obter os scripts atualizados e detectar a nova versão.
4. Validar os cenários abaixo com contas de teste.

## Estrutura

- `clientes`: perfil privado das contas de clientes.
- `prestador`: perfil privado das contas de prestadores.
- `auth.users`: identidade, credenciais e autenticação, gerenciadas pelo Supabase.
- `usuarios`: registro compatível com os relacionamentos atuais; suas alterações
  sincronizam os perfis separados por trigger.
- `prestadores`: dados profissionais, serviços e disponibilidade já usados pelo site.

As duas novas tabelas têm RLS e permitem leitura apenas ao titular e a admins
ativos. Gravações são feitas por triggers; o navegador não pode inserir um segundo
perfil nem trocar o tipo da conta. As políticas das tabelas operacionais antigas
não são substituídas por esta migração.

Contas com registro em `usuarios` são migradas pelo tipo já cadastrado. Contas
antigas sem esse registro são recuperadas pelos metadados de cadastro do Auth,
excluindo administradores. Registros demonstrativos sem conta Auth não viram
contas reais. A migração não armazena senhas nas tabelas públicas.

O cadastro novo envia `cadastro_helpgo: "2"`. Um trigger grava perfil, endereço
e vínculo de serviço na transação de criação no Auth, inclusive quando o usuário
ainda precisa confirmar o e-mail. Se alguma gravação falhar, o cadastro é revertido.
Até a migração existir, o frontend continua usando o fluxo anterior. Essa
compatibilidade só é ativada quando o RPC de versão não existe, nunca por erro
de rede ou permissão.

## Validação no projeto remoto

- Cadastro de cliente: uma linha em `clientes`, nenhuma em `prestador`.
- Cadastro de prestador: uma linha em `prestador`, nenhuma em `clientes`, com
  endereço e serviço vinculados.
- Repetir com confirmação de e-mail ligada e desligada.
- Confirmar login de cliente, prestador e admin e seus destinos corretos.
- Verificar contas antigas e contagens do painel administrativo.
- Verificar que trocar `tipo` nos metadados/localStorage não muda o acesso.
- Com JWT de cliente A, consultar cliente B e prestador: nenhum perfil retornado.
- Com JWT de prestador, tentar inserir em `clientes` e trocar `usuarios.tipo`:
  ambas as operações devem ser recusadas.
- Verificar disponibilidade, criação/aceite de solicitação e logout.
- Reaplicar a migração: não deve duplicar perfis, endereços ou vínculos.

Referência: [gerenciamento de dados de usuários no Supabase](https://supabase.com/docs/guides/auth/managing-user-data).
