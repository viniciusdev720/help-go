# Listagem de prestadores para clientes

## Instalação necessária

O frontend usa `helpgo_listar_prestadores`. Execute o conteúdo inteiro de
`catalogo-prestadores.sql` no SQL Editor do projeto `pewymcmmgzjgjrplxkzt`.
Depois recarregue a tela do cliente. Reaplique o arquivo atualizado para incluir
o telefone de contato usado pelo botão de WhatsApp. A versão anterior foi aplicada
pelo usuário; esta atualização ainda depende de execução no SQL Editor.

Não execute `prestadores.sql` para resolver a listagem: ele inclui cadastros
demonstrativos. O catálogo novo parte das contas existentes em `auth.users`,
usa os nomes de `usuarios` e os serviços vinculados; em cadastros incompletos,
usa nome e categoria informados no cadastro do Auth. Não inventa nomes ou
profissões e não concede privilégios com base nesses metadados.

Somente usuários autenticados não anônimos podem ler o catálogo. A função
privilegiada fica no schema `helpgo_catalogo`, que não deve ser exposto na Data
API. O resultado contém dados profissionais e o telefone/WhatsApp cadastrado para
contato; não retorna e-mail, CPF, endereço, senha ou tokens. As políticas dos perfis privados continuam
intactas. Não é necessário instalar `separar-perfis.sql` antes deste script.

## Verificação após instalar

- Entrar como cliente e conferir os nomes e profissões com os cadastros reais.
- Conferir prestadores indisponíveis e contas antigas sem linha em `prestadores`.
- Conferir mais de uma profissão e profissão ausente (indicada como não informada).
- Conferir que perfis demonstrativos sem conta Auth e clientes não aparecem.
- Chamar o RPC sem sessão: deve retornar erro de permissão.
- Rodar os Security Advisors do Supabase após a instalação.

O catálogo é somente de leitura. Contas antigas incompletas ainda podem precisar
de reparo nos registros operacionais para aceitar solicitações de serviço.
