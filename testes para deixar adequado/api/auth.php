<?php
// =======================================================
// HELPGO - AUTENTICAÇÃO E CONTROLE DE ACESSO (PHP)
// =======================================================

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';
$input = get_json_input();

switch ($action) {

    // =======================================================
    // 1. CADASTRO DE CLIENTE
    // =======================================================
    case 'cadastro_cliente':
    case 'cadastro-cliente':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $nome = trim($input['nome'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $senha = $input['senha'] ?? '';
        $telefone = trim($input['telefone'] ?? '');
        $cpf = trim($input['cpf'] ?? '');

        $cep = trim($input['cep'] ?? '');
        $rua = trim($input['rua'] ?? '');
        $numero = trim($input['numero'] ?? '');
        $bairro = trim($input['bairro'] ?? '');
        $cidade = trim($input['cidade'] ?? '');
        $estado = trim($input['estado'] ?? '');

        if (empty($nome) || empty($email) || empty($senha)) {
            json_response(['error' => 'Nome, e-mail e senha são obrigatórios.'], 400);
        }

        if (strlen($senha) < 6) {
            json_response(['error' => 'A senha deve ter no mínimo 6 caracteres.'], 400);
        }

        // Verificar se e-mail já existe
        $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmtCheck->execute([$email]);
        if ($stmtCheck->fetch()) {
            json_response(['error' => 'Este e-mail já está cadastrado.'], 409);
        }

        $hashSenha = password_hash($senha, PASSWORD_DEFAULT);
        $tipo = ($email === 'testenedfor@gmail.com') ? 'admin' : 'cliente';

        try {
            $pdo->beginTransaction();

            $stmtUser = $pdo->prepare("
                INSERT INTO usuarios (nome, email, senha, telefone, cpf, tipo)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmtUser->execute([$nome, $email, $hashSenha, $telefone, $cpf, $tipo]);
            $usuarioId = (int)$pdo->lastInsertId();

            if (!empty($cep) || !empty($cidade)) {
                $stmtEnd = $pdo->prepare("
                    INSERT INTO enderecos (usuario_id, cep, rua, numero, bairro, cidade, estado)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmtEnd->execute([$usuarioId, $cep, $rua, $numero, $bairro, $cidade, $estado]);
            }

            $pdo->commit();

            $_SESSION['usuario_id'] = $usuarioId;
            $usuario = get_logged_user($pdo);

            json_response([
                'success' => true,
                'message' => 'Conta de cliente criada com sucesso!',
                'user' => $usuario
            ], 201);

        } catch (Exception $e) {
            $pdo->rollBack();
            json_response(['error' => 'Erro ao salvar cadastro: ' . $e->getMessage()], 500);
        }
        break;

    // =======================================================
    // 2. CADASTRO DE PRESTADOR DE SERVIÇOS
    // =======================================================
    case 'cadastro_prestador':
    case 'cadastro-prestador':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $nome = trim($input['nome'] ?? '');
        $email = strtolower(trim($input['email'] ?? ''));
        $senha = $input['senha'] ?? '';
        $telefone = trim($input['telefone'] ?? '');
        $cpf = trim($input['cpf'] ?? '');
        $categoria = trim($input['categoria'] ?? $input['cat_serv'] ?? 'Outros');
        $descricao = trim($input['descricao'] ?? '');

        $cep = trim($input['cep'] ?? '');
        $endereco = trim($input['endereco'] ?? '');
        $numero = trim($input['numero'] ?? '');
        $cidade = trim($input['cidade'] ?? '');
        $estado = trim($input['estado'] ?? '');

        if (empty($nome) || empty($email) || empty($senha) || empty($categoria)) {
            json_response(['error' => 'Preencha todos os campos obrigatórios.'], 400);
        }

        if (strlen($senha) < 6) {
            json_response(['error' => 'A senha deve ter no mínimo 6 caracteres.'], 400);
        }

        // Verificar e-mail duplicado
        $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmtCheck->execute([$email]);
        if ($stmtCheck->fetch()) {
            json_response(['error' => 'Este e-mail já está cadastrado.'], 409);
        }

        $hashSenha = password_hash($senha, PASSWORD_DEFAULT);
        $tipo = ($email === 'testenedfor@gmail.com') ? 'admin' : 'prestador';

        try {
            $pdo->beginTransaction();

            $stmtUser = $pdo->prepare("
                INSERT INTO usuarios (nome, email, senha, telefone, cpf, tipo)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmtUser->execute([$nome, $email, $hashSenha, $telefone, $cpf, $tipo]);
            $usuarioId = (int)$pdo->lastInsertId();

            $stmtPrest = $pdo->prepare("
                INSERT INTO prestadores (usuario_id, categoria, descricao, ativo, avaliacao, total_avaliacoes, verificado)
                VALUES (?, ?, ?, 1, 5.0, 0, 1)
            ");
            $stmtPrest->execute([$usuarioId, $categoria, $descricao]);

            if (!empty($cep) || !empty($cidade)) {
                $stmtEnd = $pdo->prepare("
                    INSERT INTO enderecos (usuario_id, cep, rua, numero, bairro, cidade, estado)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmtEnd->execute([$usuarioId, $cep, $endereco, $numero, '', $cidade, $estado]);
            }

            $pdo->commit();

            $_SESSION['usuario_id'] = $usuarioId;
            $usuario = get_logged_user($pdo);

            json_response([
                'success' => true,
                'message' => 'Conta de prestador criada com sucesso!',
                'user' => $usuario
            ], 201);

        } catch (Exception $e) {
            $pdo->rollBack();
            json_response(['error' => 'Erro ao salvar cadastro de prestador: ' . $e->getMessage()], 500);
        }
        break;

    // =======================================================
    // 3. LOGIN
    // =======================================================
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_response(['error' => 'Método inválido.'], 405);
        }

        $email = strtolower(trim($input['email'] ?? ''));
        $senha = $input['senha'] ?? '';

        if (empty($email) || empty($senha)) {
            json_response(['error' => 'Informe o e-mail e a senha.'], 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($senha, $user['senha'])) {
            json_response(['error' => 'E-mail ou senha incorretos.'], 401);
        }

        if ($user['status'] === 'bloqueado') {
            json_response(['error' => 'Sua conta foi suspensa pela administração.'], 403);
        }

        $_SESSION['usuario_id'] = $user['id'];
        $usuario = get_logged_user($pdo);

        json_response([
            'success' => true,
            'message' => 'Login realizado com sucesso!',
            'user' => $usuario
        ]);
        break;

    // =======================================================
    // 4. VERIFICAR USUÁRIO ATUAL (ME)
    // =======================================================
    case 'me':
        $usuario = get_logged_user($pdo);
        if (!$usuario) {
            json_response(['authenticated' => false, 'user' => null]);
        }
        json_response(['authenticated' => true, 'user' => $usuario]);
        break;

    // =======================================================
    // 5. LOGOUT
    // =======================================================
    case 'logout':
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        json_response(['success' => true, 'message' => 'Sessão encerrada com sucesso.']);
        break;

    default:
        json_response(['error' => 'Ação não reconhecida.'], 400);
}
