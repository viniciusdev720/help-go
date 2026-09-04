<?php
// =======================================================
// HELPGO - CONEXÃO COM BANCO DE DADOS E NÚCLEO DA API (PHP + SQLite)
// =======================================================



// Caminho do banco de dados SQLite
$dbPath = __DIR__ . '/database.sqlite';

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    // Habilitar integridade de Chaves Estrangeiras no SQLite
    $pdo->exec("PRAGMA foreign_keys = ON;");
} catch (PDOException $e) {
    json_response(['error' => 'Falha ao conectar com o banco de dados: ' . $e->getMessage()], 500);
}

// Inicializar Tabelas
init_database($pdo);

/**
 * Criação e migração automática do esquema do banco de dados
 */
function init_database(PDO $pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            senha TEXT NOT NULL,
            telefone TEXT,
            cpf TEXT,
            tipo TEXT NOT NULL DEFAULT 'cliente', -- 'cliente', 'prestador', 'admin'
            status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'bloqueado'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS prestadores (
            usuario_id INTEGER PRIMARY KEY,
            categoria TEXT NOT NULL,
            descricao TEXT,
            ativo INTEGER DEFAULT 1, -- 1 = online/disponível, 0 = indisponível
            avaliacao REAL DEFAULT 5.0,
            total_avaliacoes INTEGER DEFAULT 0,
            verificado INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS enderecos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            cep TEXT,
            rua TEXT,
            numero TEXT,
            bairro TEXT,
            cidade TEXT,
            estado TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS solicitacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            prestador_id INTEGER,
            servico TEXT NOT NULL,
            servico_id TEXT,
            descricao TEXT NOT NULL,
            cep TEXT,
            endereco TEXT,
            urgencia TEXT DEFAULT 'normal', -- 'normal', 'urgente', 'emergencia'
            orcamento TEXT,
            data_agendada TEXT,
            status TEXT DEFAULT 'aberto', -- 'aberto', 'em_andamento', 'concluido', 'avaliado', 'cancelado'
            avaliacao_nota REAL,
            avaliacao_comentario TEXT,
            avaliacao_tag TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (prestador_id) REFERENCES usuarios(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS mensagens_chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            solicitacao_id INTEGER,
            remetente_id INTEGER NOT NULL,
            destinatario_id INTEGER NOT NULL,
            mensagem TEXT NOT NULL,
            lida INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE,
            FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            descricao TEXT,
            icone TEXT,
            cor TEXT
        );
    ");

    // Seed de serviços padrão se tabela estiver vazia
    $count = $pdo->query("SELECT COUNT(*) FROM servicos")->fetchColumn();
    if ($count == 0) {
        $servicos = [
            ['Eletricista', 'Instalações elétricas, reparos de quadros, tomadas, chuveiros e iluminação.', '⚡', 'green'],
            ['Encanador', 'Reparos hidráulicos, vazamentos, desentupimentos, torneiras e caixas d\'água.', '🔧', 'blue'],
            ['Pintor', 'Pintura residencial, comercial, texturas, massa corrida e restaurações.', '🎨', 'orange'],
            ['Ar-condicionado', 'Instalação, limpeza, higienização e manutenção de ar-condicionado.', '❄️', 'cyan'],
            ['Chaveiro', 'Abertura de portas, cópias de chaves, troca de fechaduras e travas.', '🔑', 'purple'],
            ['Limpeza', 'Limpeza residencial, comercial, pós-obra e diaristas qualificadas.', '🧹', 'yellow'],
            ['Marceneiro', 'Montagem de móveis, reparos em armários, portas e peças de madeira.', '🪚', 'brown'],
            ['Pedreiro', 'Pequenas reformas, alvenaria, pisos, azulejos e acabamentos.', '🧱', 'gray'],
            ['Jardineiro', 'Poda, manutenção de jardins, corte de grama e paisagismo.', '🌱', 'green'],
            ['Técnico de Informática', 'Manutenção de computadores, redes, formatação e suporte.', '💻', 'blue']
        ];
        $stmt = $pdo->prepare("INSERT INTO servicos (nome, descricao, icone, cor) VALUES (?, ?, ?, ?)");
        foreach ($servicos as $s) {
            $stmt->execute($s);
        }
    }
}

/**
 * Responde a requisição em formato JSON
 */
function json_response($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Lê o corpo JSON da requisição POST/PUT
 */
function get_json_input() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Retorna o usuário logado na sessão atual
 */
function get_logged_user($pdo) {
    if (empty($_SESSION['usuario_id'])) {
        return null;
    }

    $stmt = $pdo->prepare("
        SELECT u.id, u.nome, u.email, u.telefone, u.cpf, u.tipo, u.status, u.created_at,
               p.categoria, p.descricao, p.ativo, p.avaliacao, p.total_avaliacoes, p.verificado
        FROM usuarios u
        LEFT JOIN prestadores p ON p.usuario_id = u.id
        WHERE u.id = ?
    ");
    $stmt->execute([$_SESSION['usuario_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        unset($_SESSION['usuario_id']);
        return null;
    }

    // Se o e-mail for o admin exclusivo, marcar is_admin = true
    $user['is_admin'] = (strtolower(trim($user['email'])) === 'testenedfor@gmail.com');
    if ($user['is_admin']) {
        $user['tipo'] = 'admin';
    }

    return $user;
}

/**
 * Exige autenticação. Se não autenticado, encerra com erro 401
 */
function require_auth($pdo) {
    $user = get_logged_user($pdo);
    if (!$user) {
        json_response(['error' => 'Sessão não autenticada ou expirada. Faça login novamente.'], 401);
    }
    if ($user['status'] === 'bloqueado') {
        json_response(['error' => 'Sua conta está temporariamente suspensa.'], 403);
    }
    return $user;
}

/**
 * Exige acesso restrito de Administrador (apenas testenedfor@gmail.com)
 */
function require_admin($pdo) {
    $user = require_auth($pdo);
    if (!$user['is_admin'] && strtolower(trim($user['email'])) !== 'testenedfor@gmail.com') {
        json_response(['error' => 'Acesso negado: Somente o administrador pode acessar este recurso.'], 403);
    }
    return $user;
}
