# Implementação de autenticação, tokens e segurança — HelpGo

Quero que você faça uma **implementação completa e segura do sistema de autenticação do HelpGo**, utilizando a estrutura atual do projeto como base.

O principal objetivo é permitir que o usuário faça login e **permaneça autenticado enquanto navega pelo sistema**, sem precisar fazer login novamente a cada página, além de proteger as funcionalidades de cliente e prestador.

A implementação deve ser feita **sem quebrar o restante do projeto**.

---

# 1. Antes de alterar qualquer coisa

Primeiro analise completamente o projeto atual.

Verifique:

* Como o cadastro funciona;
* Como o login funciona;
* Como a sessão atual é armazenada;
* Se já existe autenticação pelo Supabase;
* Como o banco está conectado;
* Como o cliente é identificado;
* Como o prestador é identificado;
* Como as páginas verificam se o usuário está logado;
* Como as requisições ao banco são realizadas;
* Quais arquivos JavaScript controlam autenticação;
* Quais arquivos PHP/backend participam da autenticação;
* Quais páginas atualmente podem ser acessadas sem login.

**Não substitua uma implementação existente sem antes entender como ela funciona.**

Se o Supabase Auth já estiver sendo utilizado, aproveite o sistema existente em vez de criar uma autenticação paralela desnecessária.

---

# 2. Objetivo da autenticação

Quero que o sistema funcione desta forma:

```text
Usuário
   ↓
Login
   ↓
Autenticação
   ↓
Token / Sessão
   ↓
Usuário permanece autenticado
   ↓
Cliente ou Prestador
   ↓
Acesso às páginas protegidas
```

Depois de fazer login, o usuário deve poder navegar entre:

### Cliente

* Início;
* Solicitar serviço;
* Minhas solicitações;
* Profissionais;
* Perfil.

### Prestador

* Início;
* Solicitações;
* Serviços;
* Perfil;
* Histórico.

Sem precisar realizar login novamente a cada página.

---

# 3. Tokens de autenticação

Implemente o sistema de autenticação utilizando **tokens seguros e apropriados para a tecnologia já utilizada pelo projeto**.

Se o projeto utiliza Supabase Auth, utilize o mecanismo oficial de sessão/token do Supabase.

Não crie um sistema de JWT próprio se isso não for necessário.

O sistema deve:

* Obter a sessão após o login;
* Manter a sessão enquanto o usuário estiver autenticado;
* Recuperar a sessão quando a página for recarregada;
* Verificar se o token ainda é válido;
* Renovar/atualizar a sessão quando necessário;
* Detectar sessão expirada;
* Redirecionar o usuário para o login quando a sessão não for mais válida;
* Fazer logout corretamente;
* Limpar a sessão quando o usuário sair.

---

# 4. Persistência da sessão

O usuário não deve perder a autenticação simplesmente porque:

* Recarregou a página;
* Mudou de página;
* Abriu outra área do sistema;
* Fechou e abriu novamente o navegador, quando a política de persistência configurada permitir.

Exemplo:

```text
Login
 ↓
Cliente autenticado
 ↓
cliente/index.html
 ↓
cliente/solicitar.html
 ↓
cliente/solicitacoes.html
 ↓
cliente/perfil.html
```

O usuário deve continuar autenticado durante toda essa navegação.

---

# 5. Proteção das páginas

Crie um mecanismo centralizado para proteger as páginas privadas.

Por exemplo:

```text
js/
└── auth/
    ├── auth.js
    ├── guard.js
    └── logout.js
```

O `guard.js` deve verificar se existe uma sessão válida antes de permitir o acesso às páginas protegidas.

Exemplo conceitual:

```text
Página protegida
       ↓
Verificar sessão
       ↓
 ┌─────┴─────┐
 ↓           ↓
Válida     Inválida
 ↓           ↓
Permitir   Login
acesso
```

Não quero repetir dezenas de vezes a mesma lógica de autenticação em cada página.

---

# 6. Separação entre cliente e prestador

O sistema possui dois tipos principais de usuário:

```text
CLIENTE
PRESTADOR
```

O sistema deve identificar corretamente o tipo do usuário autenticado.

### Cliente

Um cliente não deve conseguir acessar páginas exclusivas do prestador.

### Prestador

Um prestador não deve conseguir acessar páginas exclusivas do cliente.

Exemplo:

```text
Cliente autenticado
      ↓
/cliente/*
```

```text
Prestador autenticado
      ↓
/prestador/*
```

Se um cliente tentar acessar:

```text
/prestador/index.html
```

deve ser impedido ou redirecionado.

Da mesma forma, um prestador não deve acessar funcionalidades exclusivas do cliente.

---

# 7. Não confiar apenas no JavaScript

A proteção do frontend não deve ser considerada suficiente.

Não faça apenas:

```javascript
if (!usuario) {
    window.location.href = "login.html";
}
```

Isso é apenas uma proteção visual/navegacional.

As operações importantes também precisam ser protegidas no backend/banco.

Por exemplo:

* Criar solicitação;
* Alterar solicitação;
* Cancelar solicitação;
* Aceitar solicitação;
* Concluir solicitação;
* Alterar perfil;
* Alterar serviços do prestador;
* Consultar informações privadas;
* Alterar dados de usuários.

O sistema deve verificar a autenticação e autorização também no lado responsável pelo acesso aos dados.

---

# 8. Segurança do banco de dados

Analise as políticas de segurança do Supabase.

Se o projeto estiver utilizando Supabase, verifique se as tabelas sensíveis estão protegidas adequadamente com **Row Level Security (RLS)**.

Não permita que qualquer usuário autenticado consiga consultar ou alterar dados de outros usuários sem autorização.

Por exemplo:

### Usuário A

Deve conseguir acessar seus próprios dados.

### Usuário B

Não deve conseguir acessar ou modificar os dados privados do Usuário A simplesmente alterando um ID na requisição.

Nunca confie em algo como:

```javascript
usuario_id = 5;
```

enviado pelo frontend como mecanismo de segurança.

A identidade deve ser determinada a partir da sessão/autenticação.

---

# 9. Solicitações de serviço

Preste atenção especial às solicitações.

Um cliente deve poder:

* Criar sua própria solicitação;
* Visualizar suas próprias solicitações;
* Cancelar suas próprias solicitações, quando permitido.

Um prestador deve poder:

* Visualizar solicitações destinadas a ele ou compatíveis com seus serviços;
* Aceitar solicitações permitidas;
* Atualizar o status de solicitações que ele realmente possui;
* Visualizar seu próprio histórico.

Um usuário não deve conseguir manipular a solicitação de outra pessoa alterando simplesmente o ID enviado pelo frontend.

---

# 10. Perfil do usuário

Proteja as informações pessoais.

Dados como:

* Nome;
* CPF;
* Telefone;
* Endereço;
* E-mail;
* Dados do perfil;

não devem ficar disponíveis publicamente sem necessidade.

O usuário autenticado deve conseguir acessar e alterar apenas os dados que possui permissão para acessar.

---

# 11. Senhas

Nunca armazene senhas diretamente no banco de dados.

Não faça:

```text
senha = "123456"
```

nem:

```text
senha = md5(...)
```

nem implemente criptografia própria para substituir autenticação.

Se o Supabase Auth já estiver sendo utilizado, deixe o gerenciamento de senha sob responsabilidade do sistema de autenticação apropriado.

---

# 12. Logout

Implemente um logout centralizado.

Quando o usuário clicar em "Sair":

```text
Clique em Sair
      ↓
Encerrar sessão
      ↓
Invalidar/remover sessão local
      ↓
Redirecionar para login
```

Depois do logout, o usuário não deve conseguir retornar às páginas privadas simplesmente utilizando o botão "Voltar" do navegador.

As páginas protegidas devem verificar novamente a sessão.

---

# 13. Sessão expirada

Caso o token/sessão expire:

```text
Sessão expirada
      ↓
Detectar
      ↓
Limpar sessão inválida
      ↓
Mensagem amigável
      ↓
Login
```

Não deixe o usuário preso em uma página quebrada.

Utilize uma mensagem como:

> Sua sessão expirou. Faça login novamente para continuar.

---

# 14. Armazenamento de tokens

Analise cuidadosamente onde os tokens/sessões estão sendo armazenados.

Não coloque tokens secretos:

* No HTML;
* Em variáveis públicas desnecessárias;
* No código-fonte;
* Em arquivos enviados ao Git;
* Em URLs;
* Em parâmetros GET.

Não exponha:

* Service Role Key;
* Chaves privadas;
* Senhas do banco;
* Secrets;
* Tokens administrativos.

**Nunca coloque uma Supabase Service Role Key no frontend.**

Se existir alguma chave sensível atualmente no frontend, identifique o problema e corrija-o sem quebrar a aplicação.

---

# 15. Variáveis de ambiente

Verifique as configurações sensíveis do projeto.

Organize corretamente:

```text
.env
```

e arquivos de configuração.

O `.env` não deve ser enviado para o Git.

Crie/atualize:

```text
.gitignore
```

para impedir o envio de:

```text
.env
.env.*
```

quando apropriado.

As chaves públicas necessárias para o frontend podem permanecer conforme a arquitetura oficial da ferramenta utilizada, mas **segredos administrativos nunca devem ser expostos**.

---

# 16. Controle de acesso

Implemente autenticação e autorização separadamente.

### Autenticação

Responde:

> "Quem é o usuário?"

### Autorização

Responde:

> "O que esse usuário pode fazer?"

Exemplo:

```text
Usuário autenticado
       ↓
Qual é o tipo?
       ↓
Cliente / Prestador
       ↓
Quais recursos ele pode acessar?
       ↓
Permitir ou negar
```

---

# 17. Não quebrar o sistema existente

Essa parte é extremamente importante.

**Não quero uma reconstrução completa do projeto.**

Preserve:

* Layout;
* CSS;
* HTML;
* Sistema de cadastro;
* Sistema de login;
* Banco de dados;
* Serviços;
* Prestadores;
* Tela do cliente;
* Tela do prestador;
* Solicitações;
* Filtros;
* Mapas;
* APIs já utilizadas;
* Integrações existentes.

Faça alterações somente quando forem necessárias para implementar a autenticação e segurança.

Se algum arquivo precisar ser alterado, preserve todas as funcionalidades que já existem nele.

---

# 18. Refatoração sem duplicação

Centralize a autenticação.

Por exemplo:

```text
js/
└── auth/
    ├── auth.js
    ├── session.js
    ├── guard.js
    ├── permissions.js
    └── logout.js
```

A estrutura final deve ser definida com base na estrutura real do projeto.

Não crie arquivos desnecessários.

---

# 19. Tratamento de erros

Todas as operações de autenticação devem possuir tratamento de erros.

Exemplos:

* Login inválido;
* Sessão inexistente;
* Token expirado;
* Usuário não encontrado;
* Erro de conexão;
* Erro de autorização;
* Usuário sem permissão;
* Falha no logout.

As mensagens mostradas ao usuário devem ser claras, mas não devem revelar informações sensíveis.

---

# 20. Proteção contra manipulação do frontend

Considere que o usuário pode modificar o JavaScript pelo navegador.

Portanto, não confie em:

```javascript
localStorage.setItem("tipo_usuario", "prestador");
```

como mecanismo real de autorização.

Também não confie em:

```javascript
usuario_id = 10;
```

enviado pelo frontend.

O frontend pode controlar a interface, mas a autorização real deve ser aplicada no backend/banco.

---

# 21. Verificação de dados

Ao criar ou alterar dados:

* Validar entradas;
* Evitar SQL Injection;
* Evitar XSS;
* Não aceitar IDs arbitrários sem verificar autorização;
* Não confiar em dados enviados pelo navegador;
* Validar tipos e formatos;
* Utilizar consultas seguras;
* Não expor informações sensíveis em mensagens de erro.

---

# 22. Fluxo final esperado

O sistema deverá funcionar aproximadamente assim:

```text
                  LOGIN
                    │
                    ↓
             Autenticação
                    │
                    ↓
              Sessão criada
                    │
                    ↓
             Usuário identificado
                    │
             ┌──────┴──────┐
             ↓             ↓
          CLIENTE       PRESTADOR
             │             │
             ↓             ↓
       Área protegida Área protegida
             │             │
             └──────┬──────┘
                    ↓
             Banco de dados
                    │
                    ↓
          RLS / autorização
                    │
                    ↓
          Dados permitidos
```

---

# 23. Testes obrigatórios

Depois de implementar, faça uma verificação completa.

Teste pelo menos:

### Login

* [ ] Login correto;
* [ ] Login incorreto;
* [ ] Usuário inexistente;
* [ ] Sessão criada corretamente.

### Persistência

* [ ] Recarregar página;
* [ ] Navegar entre páginas;
* [ ] Fechar e abrir o navegador conforme a política de persistência;
* [ ] Verificar recuperação da sessão.

### Proteção

* [ ] Acessar página privada sem login;
* [ ] Acessar página de cliente como prestador;
* [ ] Acessar página de prestador como cliente;
* [ ] Tentar acessar dados de outro usuário;
* [ ] Tentar alterar dados de outro usuário.

### Logout

* [ ] Logout;
* [ ] Voltar pelo navegador depois do logout;
* [ ] Tentar abrir página privada depois do logout.

### Solicitações

* [ ] Cliente cria solicitação;
* [ ] Cliente vê apenas suas solicitações;
* [ ] Prestador vê apenas solicitações permitidas;
* [ ] Prestador altera somente solicitações autorizadas;
* [ ] Usuário não consegue manipular IDs de terceiros.

### Banco

* [ ] RLS configurado corretamente;
* [ ] Políticas testadas;
* [ ] Usuário não consegue acessar dados indevidos;
* [ ] Usuário não consegue modificar dados indevidos.

---

# 24. Resultado final esperado

Ao terminar, quero ter um HelpGo em que:

* O usuário faz login uma vez;
* A sessão permanece ativa;
* O token/sessão é gerenciado corretamente;
* O usuário consegue navegar sem fazer login novamente;
* Sessões expiradas são tratadas;
* Logout funciona corretamente;
* Cliente e prestador possuem permissões diferentes;
* As páginas privadas são protegidas;
* As operações importantes são protegidas;
* O banco possui políticas de segurança adequadas;
* Usuários não conseguem acessar dados de terceiros;
* Tokens e secrets não ficam expostos;
* Senhas não são armazenadas manualmente;
* O sistema continua utilizando os dados dinâmicos do banco;
* O design atual não é quebrado;
* O cadastro continua funcionando;
* O login continua funcionando;
* As solicitações continuam funcionando;
* A tela do cliente continua funcionando;
* A tela do prestador continua funcionando.

**Antes de finalizar, revise o projeto inteiro procurando possíveis brechas causadas pela implementação da autenticação e corrija-as.**

Não considere a tarefa concluída apenas porque o login funciona.

A tarefa só estará concluída quando a **autenticação, persistência da sessão, autorização e proteção dos dados estiverem funcionando em conjunto com as funcionalidades existentes do HelpGo, sem quebrar o sistema atual.**
