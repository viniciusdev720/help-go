<?php
require_once __DIR__ . '/../api/db.php';

// Limpar tabelas de dados de teste
$pdo->exec("DELETE FROM mensagens_chat;");
$pdo->exec("DELETE FROM solicitacoes;");
$pdo->exec("DELETE FROM enderecos;");
$pdo->exec("DELETE FROM prestadores;");
$pdo->exec("DELETE FROM usuarios;");

// Garantir conta ADM Master para testenedfor@gmail.com
$senhaHash = password_hash("admin123", PASSWORD_DEFAULT);
$stmtAdmin = $pdo->prepare("
    INSERT INTO usuarios (nome, email, senha, telefone, tipo, status) 
    VALUES (?, ?, ?, ?, ?, ?)
");
$stmtAdmin->execute([
    'Administrador Master',
    'testenedfor@gmail.com',
    $senhaHash,
    '(11) 99999-9999',
    'admin',
    'ativo'
]);

echo "Banco de dados limpo com sucesso! Apenas conta ADM configurada.\n";
