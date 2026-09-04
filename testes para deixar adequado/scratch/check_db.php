<?php
require_once __DIR__ . '/../api/db.php';
$stmt = $pdo->query("SELECT id, nome, email, tipo, status FROM usuarios");
echo "=== USUARIOS ===\n";
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt2 = $pdo->query("SELECT * FROM prestadores");
echo "=== PRESTADORES ===\n";
print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));
