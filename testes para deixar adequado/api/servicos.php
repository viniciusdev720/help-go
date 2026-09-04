<?php
// =======================================================
// HELPGO - SERVIÇO DE CATEGORIAS DE SERVIÇOS (PHP + SQLite)
// =======================================================

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? 'listar';

switch ($action) {
    case 'listar':
        $stmt = $pdo->query("SELECT * FROM servicos ORDER BY nome ASC");
        $servicos = $stmt->fetchAll();

        json_response([
            'success' => true,
            'total' => count($servicos),
            'data' => array_map(function($s) {
                return [
                    'id' => (int)$s['id'],
                    'nome' => $s['nome'],
                    'descricao' => $s['descricao'],
                    'icone' => $s['icone'],
                    'cor' => $s['cor']
                ];
            }, $servicos)
        ]);
        break;

    default:
        json_response(['error' => 'Ação não reconhecida.'], 400);
}
