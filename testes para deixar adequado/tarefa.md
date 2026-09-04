# Regra de exibição dos prestadores

A tela do cliente **não deve depender exclusivamente de um prestador fazer login naquele momento** para aparecer.

O sistema deve buscar os prestadores que **já existem no banco de dados** e verificar suas informações e status.

O funcionamento desejado é:

```text
Banco de dados
      ↓
Existem prestadores cadastrados?
      ↓
     SIM
      ↓
Verificar se estão ativos/disponíveis
      ↓
Buscar informações do prestador
      ↓
Mostrar para o cliente
```

Portanto:

### Caso 1 — Já existe um prestador cadastrado

Se houver um prestador cadastrado no banco e ele estiver **ativo/disponível conforme as regras do sistema**, ele deverá aparecer automaticamente na tela do cliente.

Não será necessário que ele faça um novo cadastro ou que o sistema crie um prestador fictício.

---

### Caso 2 — Prestador faz login

Se um prestador já cadastrado fizer login, o sistema deve reconhecer a conta existente e atualizar seu estado conforme a lógica de disponibilidade implementada.

Exemplo:

```text
Prestador já cadastrado
        ↓
Faz login
        ↓
Sessão autenticada
        ↓
Status = disponível
        ↓
Pode aparecer para clientes
```

---

### Caso 3 — Prestador já existe, mas está indisponível

Se o prestador estiver cadastrado, mas estiver:

* Offline;
* Indisponível;
* Ocupado;
* Suspenso;
* Inativo;

ele não deve ser apresentado como disponível para novas solicitações.

A regra exata deve respeitar os campos e regras já existentes no banco.

---

# Dados exibidos

Para cada prestador disponível, buscar do banco:

* Foto de perfil;
* Nome;
* Bio/descrição;
* Serviço oferecido;
* Valor cobrado;
* Média das avaliações;
* Número total de avaliações;
* Quantidade de serviços realizados, caso exista;
* Localização/distância, caso exista;
* Status de disponibilidade;
* Status de verificação, caso exista.

Exemplo:

```text
┌──────────────────────────────────────┐
│ [FOTO]  Carlos Silva       ✓ Verificado
│         Eletricista Residencial     │
│                                     │
│         ⭐ 4,9 (42 avaliações)      │
│                                     │
│         Eletricista especializado   │
│         em instalações residenciais │
│                                     │
│         A partir de R$ 90           │
│                                     │
│ [Ver Perfil]          [Solicitar]   │
└──────────────────────────────────────┘
```

Todos esses dados devem ser **reais e provenientes do banco**.

---

# Regra importante

Não faça:

```text
"Se o prestador fizer login → criar um prestador para o cliente."
```

Faça:

```text
"Se o prestador já existir no banco → buscar seus dados → verificar status → mostrar se estiver disponível."
```

O login serve para **autenticar o prestador e atualizar/confirmar sua sessão e disponibilidade**, e não para criar um novo registro de profissional.

---

# Também deve funcionar para vários prestadores

Se existirem:

```text
Carlos
Roberto
Marcos
Juliana
André
```

no banco, o sistema deve consultar todos os prestadores elegíveis e gerar os cards dinamicamente.

Se existir apenas:

```text
Carlos
```

deve aparecer apenas Carlos.

Se existirem:

```text
0 prestadores disponíveis
```

deve aparecer:

> Nenhum profissional disponível no momento.

**Nunca criar profissionais fictícios para preencher espaço na tela.**

---

# Regra final

A fonte oficial dos profissionais será sempre o **banco de dados**.

O sistema deverá funcionar tanto para:

**Prestadores que já estavam cadastrados**

quanto para:

**Novos prestadores que forem cadastrados posteriormente.**

Ao cadastrar um novo prestador no banco, ele deverá poder aparecer automaticamente para os clientes, desde que cumpra as condições de cadastro, aprovação e disponibilidade definidas pelo sistema.

Não quero nenhuma lista fixa de profissionais no HTML, CSS ou JavaScript.
