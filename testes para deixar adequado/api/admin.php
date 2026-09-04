<?php
// =======================================================
// HELPGO - MODO ADMINISTRADOR EXCLUSIVO (PHP + SQLite)
// RESTRIÇÃO TOTAL: ACESSO PERMITIDO APENAS PARA testenedfor@gmail.com
// =======================================================

require_once __DIR__ . '/db.php';

// Verificação de segurança estrita: apenas o e-mail testenedfor@gmail.com é autorizado
$admin = require_admin($pdo);

$action = $_GET['action'] ?? 'dashboard';
$input = get_json_input();

switch ($action) {

    // =======================================================
    // 1. MÉTRICAS GERAIS DO DASHBOARD
    // =======================================================
    case 'dashboard':
        $totalClientes = (int)$pdo->query("SELECT COUNT(*) FROM usuarios WHERE tipo = 'cliente'")->fetchColumn();
        $totalPrestadores = (int)$pdo->query("SELECT COUNT(*) FROM usuarios WHERE tipo = 'prestador'")->fetchColumn();
        $totalSolicitacoes = (int)$pdo->query("SELECT COUNT(*) FROM solicitacoes")->fetchColumn();
        $totalMensagens = (int)$pdo->query("SELECT COUNT(*) FROM mensagens_chat")->fetchColumn();

        $solicitacoesAbertas = (int)$pdo->query("SELECT COUNT(*) FROM solicitacoes WHERE status = 'aberto'")->fetchColumn();
        $solicitacoesEmAndamento = (int)$pdo->query("SELECT COUNT(*) FROM solicitacoes WHERE status = 'em_andamento'")->fetchColumn();
        $solicitacoesConcluidas = (int)$pdo->query("SELECT COUNT(*) FROM solicitacoes WHERE status IN ('concluido', 'avaliado')")->fetchColumn();

        // Últimos 5 usuários cadastrados
        $stmtUsers = $pdo->query("
            SELECT u.id, u.nome, u.email, u.telefone, u.tipo, u.status, u.created_at, p.categoria
            FROM usuarios u
            LEFT JOIN prestadores p ON p.usuario_id = u.id
            ORDER BY u.created_at DESC
            LIMIT 5
        ");
        $ultimosUsuarios = $stmtUsers->fetchAll();

        // Últimos 5 chamados criados
        $stmtSols = $pdo->query("
            SELECT s.id, s.servico, s.status, s.created_at, c.nome as cliente_nome, p.nome as prestador_nome
            FROM solicitacoes s
            JOIN usuarios c ON c.id = s.cliente_id
            LEFT JOIN usuarios p ON p.id = s.prestador_id
            ORDER BY s.created_at DESC
            LIMIT 5
        ");
        $ultimasSolicitacoes = $stmtSols->fetchAll();

        json_response([
            'success' => true,
            'admin' => [
                'nome' => $admin['nome'],
                'email' => $admin['email']
            ],
            'metricas' => [
                'totalClientes' => $totalClientes,
                'totalPrestadores' => $totalPrestadores,
                'totalSolicitacoes' => $totalSolicitacoes,
                'totalMensagens' => $totalMensagens,
                'solicitacoesAbertas' => $solicitacoesAbertas,
                'solicitacoesEmAndamento' => $solicitacoesEmAndamento,
                'solicitacoesConcluidas' => $solicitacoesConcluidas
            ],
            'ultimosUsuarios' => $ultimosUsuarios,
            'ultimasSolicitacoes' => $ultimasSolicitacoes
        ]);
        break;

    // =======================================================
    // 2. LISTAR TODOS OS USUÁRIOS (CLIENTES & PRESTADORES)
    // =======================================================
    case 'usuarios':
        $tipoFiltro = $_GET['tipo'] ?? '';
        $sql = "
            SELECT u.id, u.nome, u.email, u.telefone, u.cpf, u.tipo, u.status, u.created_at,
                   p.categoria, p.ativo, p.avaliacao, p.total_avaliacoes,
                   e.cidade, e.estado, e.cep, e.rua, e.numero
            FROM usuarios u
            LEFT JOIN prestadores p ON p.usuario_id = u.id
            LEFT JOIN enderecos e ON e.usuario_id = u.id
        ";
        $params = [];
        if (!empty($tipoFiltro)) {
            $sql .= " WHERE u.tipo = ?";
            $params[] = $tipoFiltro;
        }
        $sql .= " ORDER BY u.created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $usuarios = $stmt->fetchAll();

        json_response([
            'success' => true,
            'total' => count($usuarios),
            'data' => $usuarios
        ]);
        break;

    // =======================================================
    // 3. ALTERAR STATUS DO USUÁRIO (ATIVO / BLOQUEADO)
    // =======================================================
    case 'toggle_status_usuario':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $usuarioId = (int)($input['usuario_id'] ?? 0);
        $novoStatus = trim($input['status'] ?? '');

        if (!$usuarioId || !in_array($novoStatus, ['ativo', 'bloqueado'])) {
            json_response(['error' => 'Parâmetros inválidos.'], 400);
        }

        // Não permitir bloquear o próprio admin
        $stmtCheck = $pdo->prepare("SELECT email FROM usuarios WHERE id = ?");
        $stmtCheck->execute([$usuarioId]);
        $emailUser = $stmtCheck->fetchColumn();

        if (strtolower(trim($emailUser)) === 'testenedfor@gmail.com') {
            json_response(['error' => 'Não é possível alterar o status da conta do administrador mestre.'], 403);
        }

        $stmt = $pdo->prepare("UPDATE usuarios SET status = ? WHERE id = ?");
        $stmt->execute([$novoStatus, $usuarioId]);

        json_response([
            'success' => true,
            'message' => "Status do usuário alterado para '{$novoStatus}'."
        ]);
        break;

    // =======================================================
    // 4. EXCLUIR USUÁRIO
    // =======================================================
    case 'excluir_usuario':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $usuarioId = (int)($input['usuario_id'] ?? 0);
        if (!$usuarioId) {
            json_response(['error' => 'ID do usuário obrigatório.'], 400);
        }

        $stmtCheck = $pdo->prepare("SELECT email FROM usuarios WHERE id = ?");
        $stmtCheck->execute([$usuarioId]);
        $emailUser = $stmtCheck->fetchColumn();

        if (strtolower(trim($emailUser)) === 'testenedfor@gmail.com') {
            json_response(['error' => 'Não é permitido excluir o administrador mestre.'], 403);
        }

        $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
        $stmt->execute([$usuarioId]);

        json_response([
            'success' => true,
            'message' => 'Usuário removido com sucesso.'
        ]);
        break;

    // =======================================================
    // 5. TODAS AS SOLICITAÇÕES DO SISTEMA
    // =======================================================
    case 'todas_solicitacoes':
        $stmt = $pdo->query("
            SELECT s.*, 
                   c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone,
                   p.nome as prestador_nome, p.email as prestador_email, p.telefone as prestador_telefone
            FROM solicitacoes s
            JOIN usuarios c ON c.id = s.cliente_id
            LEFT JOIN usuarios p ON p.id = s.prestador_id
            ORDER BY s.created_at DESC
        ");
        $solicitacoes = $stmt->fetchAll();

        json_response([
            'success' => true,
            'total' => count($solicitacoes),
            'data' => $solicitacoes
        ]);
        break;

    // =======================================================
    // 6. LOGS DE CHAT E CONVERSAS DO SISTEMA
    // =======================================================
    case 'logs_chat':
        $stmt = $pdo->query("
            SELECT m.*, 
                   r.nome as remetente_nome, r.tipo as remetente_tipo,
                   d.nome as destinatario_nome, d.tipo as destinatario_tipo,
                   s.servico as solicitacao_servico
            FROM mensagens_chat m
            JOIN usuarios r ON r.id = m.remetente_id
            JOIN usuarios d ON d.id = m.destinatario_id
            LEFT JOIN solicitacoes s ON s.id = m.solicitacao_id
            ORDER BY m.created_at DESC
            LIMIT 100
        ");
        $logs = $stmt->fetchAll();

        json_response([
            'success' => true,
            'total' => count($logs),
            'data' => $logs
        ]);
        break;

    default:
        json_response(['error' => 'Ação administrativa não reconhecida.'], 400);
}
