<?php
// =======================================================
// HELPGO - SERVIÇO DE PRESTADORES DE SERVIÇOS (PHP + SQLite)
// Apenas prestadores reais cadastrados no banco de dados
// =======================================================

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? 'listar';
$input = get_json_input();

switch ($action) {

    // =======================================================
    // 1. LISTAR PRESTADORES REAIS DO BANCO
    // =======================================================
    case 'listar':
        $filtroCategoria = trim($_GET['categoria'] ?? $_GET['servico'] ?? '');

        $sql = "
            SELECT u.id, u.nome, u.email, u.telefone, u.created_at,
                   p.categoria, p.descricao, p.ativo, p.avaliacao, p.total_avaliacoes, p.verificado,
                   e.cidade, e.estado, e.bairro
            FROM prestadores p
            JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN enderecos e ON e.usuario_id = u.id
            WHERE p.ativo = 1 AND u.status = 'ativo'
        ";

        $params = [];
        if (!empty($filtroCategoria) && strtolower($filtroCategoria) !== 'todos') {
            $sql .= " AND (LOWER(p.categoria) LIKE ? OR LOWER(p.descricao) LIKE ?)";
            $params[] = '%' . strtolower($filtroCategoria) . '%';
            $params[] = '%' . strtolower($filtroCategoria) . '%';
        }

        $sql .= " ORDER BY p.avaliacao DESC, u.nome ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $prestadoresRaw = $stmt->fetchAll();

        $prestadores = array_map(function($p) {
            return [
                'id' => (int)$p['id'],
                'nome' => $p['nome'],
                'email' => $p['email'],
                'telefone' => $p['telefone'],
                'especialidade' => $p['categoria'],
                'categoria' => $p['categoria'],
                'descricao' => $p['descricao'] ?: 'Profissional qualificado pronto para atender.',
                'avaliacao' => (float)$p['avaliacao'],
                'totalAvaliacoes' => (int)$p['total_avaliacoes'],
                'verificado' => (bool)$p['verificado'],
                'ativo' => (bool)$p['ativo'],
                'online' => (bool)$p['ativo'],
                'cidade' => $p['cidade'] ?: 'Região Local',
                'estado' => $p['estado'] ?: 'SP',
                'servicos' => [
                    ['id' => (int)$p['id'], 'nome' => $p['categoria']]
                ]
            ];
        }, $prestadoresRaw);

        json_response([
            'success' => true,
            'total' => count($prestadores),
            'data' => $prestadores
        ]);
        break;

    // =======================================================
    // 2. DETALHES COMPLETOS DE UM PRESTADOR
    // =======================================================
    case 'detalhes':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            json_response(['error' => 'ID do prestador inválido.'], 400);
        }

        $stmt = $pdo->prepare("
            SELECT u.id, u.nome, u.email, u.telefone, u.created_at,
                   p.categoria, p.descricao, p.ativo, p.avaliacao, p.total_avaliacoes, p.verificado,
                   e.cidade, e.estado, e.bairro, e.rua
            FROM prestadores p
            JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN enderecos e ON e.usuario_id = u.id
            WHERE u.id = ?
        ");
        $stmt->execute([$id]);
        $p = $stmt->fetch();

        if (!$p) {
            json_response(['error' => 'Prestador não encontrado.'], 404);
        }

        // Buscar avaliações reais recebidas por este prestador
        $stmtReviews = $pdo->prepare("
            SELECT s.id, s.avaliacao_nota, s.avaliacao_comentario, s.avaliacao_tag, s.updated_at,
                   u.nome as cliente_nome
            FROM solicitacoes s
            JOIN usuarios u ON u.id = s.cliente_id
            WHERE s.prestador_id = ? AND s.status = 'avaliado' AND s.avaliacao_nota IS NOT NULL
            ORDER BY s.updated_at DESC
            LIMIT 10
        ");
        $stmtReviews->execute([$id]);
        $reviews = $stmtReviews->fetchAll();

        $dados = [
            'id' => (int)$p['id'],
            'nome' => $p['nome'],
            'email' => $p['email'],
            'telefone' => $p['telefone'],
            'especialidade' => $p['categoria'],
            'descricao' => $p['descricao'] ?: 'Profissional dedicado e verificado.',
            'avaliacao' => (float)$p['avaliacao'],
            'totalAvaliacoes' => (int)$p['total_avaliacoes'],
            'verificado' => (bool)$p['verificado'],
            'ativo' => (bool)$p['ativo'],
            'online' => (bool)$p['ativo'],
            'cidade' => $p['cidade'] ?: 'Região Local',
            'estado' => $p['estado'] ?: 'SP',
            'avaliacoes' => $reviews,
            'servicos' => [
                ['id' => (int)$p['id'], 'nome' => $p['categoria']]
            ]
        ];

        json_response(['success' => true, 'data' => $dados]);
        break;

    // =======================================================
    // 3. ATUALIZAR STATUS DE DISPONIBILIDADE (ONLINE/OFFLINE)
    // =======================================================
    case 'atualizar_status':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $usuario = require_auth($pdo);
        $prestadorId = (int)($input['prestador_id'] ?? $usuario['id']);
        $ativo = isset($input['ativo']) ? (int)(bool)$input['ativo'] : 1;

        // Se for o próprio prestador ou admin
        if ($usuario['id'] !== $prestadorId && !$usuario['is_admin']) {
            json_response(['error' => 'Permissão negada para alterar status deste prestador.'], 403);
        }

        $stmt = $pdo->prepare("UPDATE prestadores SET ativo = ? WHERE usuario_id = ?");
        $stmt->execute([$ativo, $prestadorId]);

        json_response([
            'success' => true,
            'message' => 'Status atualizado com sucesso.',
            'ativo' => (bool)$ativo
        ]);
        break;

    // =======================================================
    // 4. CONTAR PRESTADORES ATIVOS
    // =======================================================
    case 'contar_ativos':
        $count = $pdo->query("
            SELECT COUNT(*) FROM prestadores p
            JOIN usuarios u ON u.id = p.usuario_id
            WHERE p.ativo = 1 AND u.status = 'ativo'
        ")->fetchColumn();

        json_response(['success' => true, 'total' => (int)$count]);
        break;

    default:
        json_response(['error' => 'Ação não reconhecida.'], 400);
}
