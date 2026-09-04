<?php
// =======================================================
// HELPGO - GERENCIAMENTO DE SOLICITAÇÕES / PEDIDOS (PHP + SQLite)
// =======================================================

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$input = get_json_input();

switch ($action) {

    // =======================================================
    // 1. CRIAR NOVA SOLICITAÇÃO (CLIENTE)
    // =======================================================
    case 'criar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $usuario = require_auth($pdo);
        $clienteId = $usuario['id'];

        $servico = trim($input['servico'] ?? '');
        $descricao = trim($input['descricao'] ?? '');
        $cep = trim($input['cep'] ?? '');
        $endereco = trim($input['endereco'] ?? '');
        $urgencia = trim($input['urgencia'] ?? 'normal');
        $orcamento = trim($input['orcamento'] ?? 'A combinar');
        $dataAgendada = trim($input['data'] ?? $input['data_agendada'] ?? '');
        $prestadorId = !empty($input['prestador_id']) ? (int)$input['prestador_id'] : null;

        if (empty($servico) || empty($descricao)) {
            json_response(['error' => 'Serviço e descrição são obrigatórios.'], 400);
        }

        $statusInicial = $prestadorId ? 'em_andamento' : 'aberto';

        $stmt = $pdo->prepare("
            INSERT INTO solicitacoes (
                cliente_id, prestador_id, servico, descricao, cep, endereco,
                urgencia, orcamento, data_agendada, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $clienteId, $prestadorId, $servico, $descricao, $cep, $endereco,
            $urgencia, $orcamento, $dataAgendada, $statusInicial
        ]);

        $pedidoId = (int)$pdo->lastInsertId();

        // Se prestador foi selecionado diretamente, criar uma mensagem inicial no chat
        if ($prestadorId) {
            $stmtChat = $pdo->prepare("
                INSERT INTO mensagens_chat (solicitacao_id, remetente_id, destinatario_id, mensagem)
                VALUES (?, ?, ?, ?)
            ");
            $msgInicial = "Olá! Criei uma nova solicitação para o serviço de {$servico}: \"{$descricao}\".";
            $stmtChat->execute([$pedidoId, $clienteId, $prestadorId, $msgInicial]);
        }

        $stmtGet = $pdo->prepare("
            SELECT s.*, u.nome as cliente_nome, p.nome as prestador_nome
            FROM solicitacoes s
            JOIN usuarios u ON u.id = s.cliente_id
            LEFT JOIN usuarios p ON p.id = s.prestador_id
            WHERE s.id = ?
        ");
        $stmtGet->execute([$pedidoId]);
        $pedido = $stmtGet->fetch();

        json_response([
            'success' => true,
            'message' => 'Solicitação criada com sucesso!',
            'pedido' => normalizar_pedido($pedido)
        ], 201);
        break;

    // =======================================================
    // 2. LISTAR SOLICITAÇÕES DO CLIENTE
    // =======================================================
    case 'minhas_solicitacoes':
        $usuario = require_auth($pdo);
        $clienteId = $usuario['id'];

        $stmt = $pdo->prepare("
            SELECT s.*, 
                   c.nome as cliente_nome, c.telefone as cliente_telefone,
                   p.nome as prestador_nome, p.telefone as prestador_telefone, p.email as prestador_email
            FROM solicitacoes s
            JOIN usuarios c ON c.id = s.cliente_id
            LEFT JOIN usuarios p ON p.id = s.prestador_id
            WHERE s.cliente_id = ?
            ORDER BY s.created_at DESC
        ");
        $stmt->execute([$clienteId]);
        $pedidos = $stmt->fetchAll();

        json_response([
            'success' => true,
            'total' => count($pedidos),
            'data' => array_map('normalizar_pedido', $pedidos)
        ]);
        break;

    // =======================================================
    // 3. LISTAR SOLICITAÇÕES DO PRESTADOR (ABERTAS + ATRIBUÍDAS)
    // =======================================================
    case 'chamados_prestador':
        $usuario = require_auth($pdo);
        $prestadorId = $usuario['id'];

        $stmt = $pdo->prepare("
            SELECT s.*, 
                   c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email,
                   p.nome as prestador_nome, p.telefone as prestador_telefone
            FROM solicitacoes s
            JOIN usuarios c ON c.id = s.cliente_id
            LEFT JOIN usuarios p ON p.id = s.prestador_id
            WHERE s.status = 'aberto' OR s.prestador_id = ?
            ORDER BY s.created_at DESC
        ");
        $stmt->execute([$prestadorId]);
        $pedidos = $stmt->fetchAll();

        json_response([
            'success' => true,
            'total' => count($pedidos),
            'data' => array_map('normalizar_pedido', $pedidos)
        ]);
        break;

    // =======================================================
    // 4. PRESTADOR ACEITA CHAMADO ABERTO
    // =======================================================
    case 'aceitar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $usuario = require_auth($pdo);
        $prestadorId = $usuario['id'];
        $pedidoId = (int)($input['pedido_id'] ?? $input['id'] ?? 0);

        if (!$pedidoId) {
            json_response(['error' => 'ID do pedido obrigatório.'], 400);
        }

        $stmtCheck = $pdo->prepare("SELECT * FROM solicitacoes WHERE id = ?");
        $stmtCheck->execute([$pedidoId]);
        $pedido = $stmtCheck->fetch();

        if (!$pedido) {
            json_response(['error' => 'Chamado não encontrado.'], 404);
        }

        if ($pedido['status'] !== 'aberto') {
            json_response(['error' => 'Este chamado não está mais aberto para aceitação.'], 400);
        }

        $stmtUpdate = $pdo->prepare("
            UPDATE solicitacoes 
            SET prestador_id = ?, status = 'em_andamento', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmtUpdate->execute([$prestadorId, $pedidoId]);

        // Criar mensagem de aceite no chat
        $stmtChat = $pdo->prepare("
            INSERT INTO mensagens_chat (solicitacao_id, remetente_id, destinatario_id, mensagem)
            VALUES (?, ?, ?, ?)
        ");
        $msgAceite = "Olá! Aceitei seu chamado para o serviço de {$pedido['servico']}. Já estou à disposição para combinarmos os detalhes!";
        $stmtChat->execute([$pedidoId, $prestadorId, $pedido['cliente_id'], $msgAceite]);

        json_response([
            'success' => true,
            'message' => 'Chamado aceito com sucesso!'
        ]);
        break;

    // =======================================================
    // 5. CONCLUIR SERVIÇO
    // =======================================================
    case 'concluir':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $usuario = require_auth($pdo);
        $pedidoId = (int)($input['pedido_id'] ?? $input['id'] ?? 0);

        if (!$pedidoId) {
            json_response(['error' => 'ID do pedido obrigatório.'], 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM solicitacoes WHERE id = ?");
        $stmt->execute([$pedidoId]);
        $pedido = $stmt->fetch();

        if (!$pedido) {
            json_response(['error' => 'Pedido não encontrado.'], 404);
        }

        // Apenas o prestador atribuído, cliente ou admin pode marcar como concluído
        if ($pedido['prestador_id'] != $usuario['id'] && $pedido['cliente_id'] != $usuario['id'] && !$usuario['is_admin']) {
            json_response(['error' => 'Você não tem permissão para concluir este serviço.'], 403);
        }

        $stmtUpdate = $pdo->prepare("
            UPDATE solicitacoes 
            SET status = 'concluido', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmtUpdate->execute([$pedidoId]);

        json_response([
            'success' => true,
            'message' => 'Serviço marcado como concluído!'
        ]);
        break;

    // =======================================================
    // 6. AVALIAR ATENDIMENTO (CLIENTE)
    // =======================================================
    case 'avaliar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $usuario = require_auth($pdo);
        $pedidoId = (int)($input['pedido_id'] ?? $input['id'] ?? 0);
        $nota = (float)($input['nota'] ?? $input['avaliacao_nota'] ?? 5.0);
        $comentario = trim($input['comentario'] ?? $input['avaliacao_comentario'] ?? '');
        $tag = trim($input['tag'] ?? $input['avaliacao_tag'] ?? '');

        if (!$pedidoId) {
            json_response(['error' => 'ID do pedido obrigatório.'], 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM solicitacoes WHERE id = ?");
        $stmt->execute([$pedidoId]);
        $pedido = $stmt->fetch();

        if (!$pedido || $pedido['cliente_id'] != $usuario['id']) {
            json_response(['error' => 'Solicitação não encontrada ou não pertence a você.'], 404);
        }

        $prestadorId = (int)$pedido['prestador_id'];

        $stmtUpdate = $pdo->prepare("
            UPDATE solicitacoes 
            SET status = 'avaliado', avaliacao_nota = ?, avaliacao_comentario = ?, avaliacao_tag = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmtUpdate->execute([$nota, $comentario, $tag, $pedidoId]);

        // Recalcular média de avaliações do prestador
        if ($prestadorId > 0) {
            $stmtAvg = $pdo->prepare("
                SELECT AVG(avaliacao_nota) as media, COUNT(*) as total
                FROM solicitacoes
                WHERE prestador_id = ? AND status = 'avaliado' AND avaliacao_nota IS NOT NULL
            ");
            $stmtAvg->execute([$prestadorId]);
            $stats = $stmtAvg->fetch();

            $novaMedia = round((float)($stats['media'] ?? 5.0), 1);
            $totalAval = (int)($stats['total'] ?? 1);

            $stmtPrest = $pdo->prepare("
                UPDATE prestadores 
                SET avaliacao = ?, total_avaliacoes = ?
                WHERE usuario_id = ?
            ");
            $stmtPrest->execute([$novaMedia, $totalAval, $prestadorId]);
        }

        json_response([
            'success' => true,
            'message' => 'Avaliação enviada com sucesso!'
        ]);
        break;

    default:
        json_response(['error' => 'Ação não reconhecida.'], 400);
}

/**
 * Normaliza os campos do pedido para compatibilidade com o frontend
 */
function normalizar_pedido($p) {
    if (!$p) return null;
    return [
        'id' => (int)$p['id'],
        'clienteId' => (int)$p['cliente_id'],
        'clienteNome' => $p['cliente_nome'] ?? 'Cliente',
        'clienteTelefone' => $p['cliente_telefone'] ?? '',
        'prestadorId' => $p['prestador_id'] ? (int)$p['prestador_id'] : null,
        'prestadorNome' => $p['prestador_nome'] ?? null,
        'prestadorTelefone' => $p['prestador_telefone'] ?? null,
        'servico' => $p['servico'],
        'servicoKey' => $p['servico_id'] ?: $p['servico'],
        'descricao' => $p['descricao'],
        'cep' => $p['cep'],
        'endereco' => $p['endereco'],
        'urgencia' => $p['urgencia'] ?: 'normal',
        'orcamento' => $p['orcamento'],
        'data' => $p['data_agendada'],
        'dataCriacao' => $p['created_at'],
        'status' => $p['status'],
        'avaliacao' => $p['avaliacao_nota'] !== null ? [
            'nota' => (float)$p['avaliacao_nota'],
            'comentario' => $p['avaliacao_comentario'] ?: '',
            'tag' => $p['avaliacao_tag'] ?: ''
        ] : null
    ];
}
