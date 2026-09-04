<?php
// =======================================================
// HELPGO - SISTEMA DE CHAT EM TEMPO REAL (PHP + SQLite)
// =======================================================

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? 'mensagens';
$input = get_json_input();
$usuario = require_auth($pdo);
$usuarioId = $usuario['id'];

switch ($action) {

    // =======================================================
    // 1. ENVIAR MENSAGEM
    // =======================================================
    case 'enviar':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $destinatarioId = (int)($input['destinatario_id'] ?? 0);
        $solicitacaoId = !empty($input['solicitacao_id']) ? (int)$input['solicitacao_id'] : null;
        $mensagem = trim($input['mensagem'] ?? '');

        if (empty($mensagem)) {
            json_response(['error' => 'A mensagem não pode estar vazia.'], 400);
        }

        // Se destinatario_id não foi passado mas solicitacao_id foi, descobrir o destinatário
        if (!$destinatarioId && $solicitacaoId) {
            $stmtSol = $pdo->prepare("SELECT cliente_id, prestador_id FROM solicitacoes WHERE id = ?");
            $stmtSol->execute([$solicitacaoId]);
            $sol = $stmtSol->fetch();
            if ($sol) {
                $destinatarioId = ($sol['cliente_id'] == $usuarioId) ? (int)$sol['prestador_id'] : (int)$sol['cliente_id'];
            }
        }

        if (!$destinatarioId || $destinatarioId === $usuarioId) {
            json_response(['error' => 'Destinatário inválido para o chat.'], 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO mensagens_chat (solicitacao_id, remetente_id, destinatario_id, mensagem)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$solicitacaoId, $usuarioId, $destinatarioId, $mensagem]);
        $msgId = (int)$pdo->lastInsertId();

        $stmtGet = $pdo->prepare("
            SELECT m.*, u.nome as remetente_nome, u.tipo as remetente_tipo
            FROM mensagens_chat m
            JOIN usuarios u ON u.id = m.remetente_id
            WHERE m.id = ?
        ");
        $stmtGet->execute([$msgId]);
        $novaMsg = $stmtGet->fetch();

        json_response([
            'success' => true,
            'message' => 'Mensagem enviada com sucesso.',
            'data' => [
                'id' => (int)$novaMsg['id'],
                'solicitacaoId' => $novaMsg['solicitacao_id'] ? (int)$novaMsg['solicitacao_id'] : null,
                'remetenteId' => (int)$novaMsg['remetente_id'],
                'remetenteNome' => $novaMsg['remetente_nome'],
                'remetenteTipo' => $novaMsg['remetente_tipo'],
                'destinatarioId' => (int)$novaMsg['destinatario_id'],
                'mensagem' => $novaMsg['mensagem'],
                'lida' => (bool)$novaMsg['lida'],
                'createdAt' => $novaMsg['created_at'],
                'minha' => true
            ]
        ], 201);
        break;

    // =======================================================
    // 2. BUSCAR HISTÓRICO DE MENSAGENS
    // =======================================================
    case 'mensagens':
        $solicitacaoId = !empty($_GET['solicitacao_id']) ? (int)$_GET['solicitacao_id'] : null;
        $outroUsuarioId = !empty($_GET['usuario_id']) ? (int)$_GET['usuario_id'] : null;

        if ($solicitacaoId) {
            $sql = "
                SELECT m.*, u.nome as remetente_nome, u.tipo as remetente_tipo
                FROM mensagens_chat m
                JOIN usuarios u ON u.id = m.remetente_id
                WHERE m.solicitacao_id = ?
                ORDER BY m.created_at ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$solicitacaoId]);
        } elseif ($outroUsuarioId) {
            $sql = "
                SELECT m.*, u.nome as remetente_nome, u.tipo as remetente_tipo
                FROM mensagens_chat m
                JOIN usuarios u ON u.id = m.remetente_id
                WHERE (m.remetente_id = ? AND m.destinatario_id = ?)
                   OR (m.remetente_id = ? AND m.destinatario_id = ?)
                ORDER BY m.created_at ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$usuarioId, $outroUsuarioId, $outroUsuarioId, $usuarioId]);
        } else {
            json_response(['error' => 'Informe solicitacao_id ou usuario_id.'], 400);
        }

        $mensagens = $stmt->fetchAll();

        // Marcar mensagens recebidas como lidas
        if ($solicitacaoId) {
            $stmtRead = $pdo->prepare("
                UPDATE mensagens_chat 
                SET lida = 1 
                WHERE solicitacao_id = ? AND destinatario_id = ? AND lida = 0
            ");
            $stmtRead->execute([$solicitacaoId, $usuarioId]);
        } elseif ($outroUsuarioId) {
            $stmtRead = $pdo->prepare("
                UPDATE mensagens_chat 
                SET lida = 1 
                WHERE remetente_id = ? AND destinatario_id = ? AND lida = 0
            ");
            $stmtRead->execute([$outroUsuarioId, $usuarioId]);
        }

        $lista = array_map(function($m) use ($usuarioId) {
            return [
                'id' => (int)$m['id'],
                'solicitacaoId' => $m['solicitacao_id'] ? (int)$m['solicitacao_id'] : null,
                'remetenteId' => (int)$m['remetente_id'],
                'remetenteNome' => $m['remetente_nome'],
                'remetenteTipo' => $m['remetente_tipo'],
                'destinatarioId' => (int)$m['destinatario_id'],
                'mensagem' => $m['mensagem'],
                'lida' => (bool)$m['lida'],
                'createdAt' => $m['created_at'],
                'minha' => ((int)$m['remetente_id'] === (int)$usuarioId)
            ];
        }, $mensagens);

        json_response([
            'success' => true,
            'total' => count($lista),
            'data' => $lista
        ]);
        break;

    // =======================================================
    // 3. LISTAR TODAS AS CONVERSAS DO USUÁRIO
    // =======================================================
    case 'conversas':
        // Agrupar conversas ativas
        $stmt = $pdo->prepare("
            SELECT 
                CASE 
                    WHEN m.remetente_id = ? THEN m.destinatario_id 
                    ELSE m.remetente_id 
                END as parceiro_id,
                u.nome as parceiro_nome,
                u.tipo as parceiro_tipo,
                p.categoria as parceiro_categoria,
                m.solicitacao_id,
                s.servico as solicitacao_servico,
                MAX(m.created_at) as ultima_data,
                (SELECT mensagem FROM mensagens_chat WHERE 
                    ((remetente_id = ? AND destinatario_id = parceiro_id) OR (remetente_id = parceiro_id AND destinatario_id = ?))
                    ORDER BY created_at DESC LIMIT 1) as ultima_mensagem,
                (SELECT COUNT(*) FROM mensagens_chat WHERE 
                    remetente_id = parceiro_id AND destinatario_id = ? AND lida = 0) as nao_lidas
            FROM mensagens_chat m
            JOIN usuarios u ON u.id = CASE WHEN m.remetente_id = ? THEN m.destinatario_id ELSE m.remetente_id END
            LEFT JOIN prestadores p ON p.usuario_id = u.id
            LEFT JOIN solicitacoes s ON s.id = m.solicitacao_id
            WHERE m.remetente_id = ? OR m.destinatario_id = ?
            GROUP BY parceiro_id, m.solicitacao_id
            ORDER BY ultima_data DESC
        ");
        $stmt->execute([
            $usuarioId,
            $usuarioId, $usuarioId,
            $usuarioId,
            $usuarioId,
            $usuarioId, $usuarioId
        ]);
        $conversas = $stmt->fetchAll();

        $lista = array_map(function($c) {
            return [
                'parceiroId' => (int)$c['parceiro_id'],
                'parceiroNome' => $c['parceiro_nome'],
                'parceiroTipo' => $c['parceiro_tipo'],
                'parceiroCategoria' => $c['parceiro_categoria'] ?: ($c['parceiro_tipo'] === 'prestador' ? 'Prestador' : 'Cliente'),
                'solicitacaoId' => $c['solicitacao_id'] ? (int)$c['solicitacao_id'] : null,
                'solicitacaoServico' => $c['solicitacao_servico'] ?: '',
                'ultimaMensagem' => $c['ultima_mensagem'] ?: '',
                'ultimaData' => $c['ultima_data'],
                'naoLidas' => (int)$c['nao_lidas']
            ];
        }, $conversas);

        json_response([
            'success' => true,
            'data' => $lista
        ]);
        break;

    // =======================================================
    // 4. TOTAL DE MENSAGENS NÃO LIDAS
    // =======================================================
    case 'nao_lidas':
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM mensagens_chat WHERE destinatario_id = ? AND lida = 0
        ");
        $stmt->execute([$usuarioId]);
        $count = $stmt->fetchColumn();

        json_response([
            'success' => true,
            'totalNaoLidas' => (int)$count
        ]);
        break;

    default:
        json_response(['error' => 'Ação não reconhecida.'], 400);
}
