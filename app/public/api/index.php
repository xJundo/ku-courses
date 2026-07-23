<?php
/**
 * KU Sejong Planner - Hostinger Community Calendars API
 * Handles CRUD operations for shared calendars using JSON file storage.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/calendars.json';

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

function getCalendars($file) {
    if (!file_exists($file)) {
        return getSeedCalendars();
    }
    $content = @file_get_contents($file);
    if (!$content) return getSeedCalendars();
    $data = json_decode($content, true);
    return is_array($data) ? $data : getSeedCalendars();
}

function saveCalendars($file, $calendars) {
    $json = json_encode(array_values($calendars), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return @file_put_contents($file, $json, LOCK_EX);
}

function getSeedCalendars() {
    $now = date('c');
    return [
        [
            'id' => 'cal_default_epitech',
            'name' => 'Exemple - Track IT & Business (3 Jours)',
            'author' => 'Communauté KU',
            'description' => 'Exemple de calendrier optimisé du lundi au mercredi.',
            'createdAt' => $now,
            'updatedAt' => $now,
            'selectedCourseKeys' => ['COSE211_01', 'COSE341_01', 'BUSN101_01', 'KORE101_01'],
            'categoryOverrides' => [],
            'ratings' => ['COSE211_01' => 5],
            'comments' => ['COSE211_01' => 'Très recommandé pour l\'échange'],
            'customCourses' => [],
            'courseCount' => 4,
            'totalCredits' => 12
        ]
    ];
}

// Get action & parameters
$action = $_GET['action'] ?? $_POST['action'] ?? '';
if (empty($action) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['id']) ? 'get' : 'list';
}

$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?? [];

$calendars = getCalendars($dataFile);

switch ($action) {
    case 'list':
        $summaries = array_map(function($cal) {
            return [
                'id' => $cal['id'] ?? '',
                'name' => $cal['name'] ?? 'Sans titre',
                'author' => $cal['author'] ?? 'Anonyme',
                'description' => $cal['description'] ?? '',
                'createdAt' => $cal['createdAt'] ?? '',
                'updatedAt' => $cal['updatedAt'] ?? '',
                'courseCount' => isset($cal['selectedCourseKeys']) ? count($cal['selectedCourseKeys']) : ($cal['courseCount'] ?? 0),
                'totalCredits' => $cal['totalCredits'] ?? 0
            ];
        }, $calendars);

        // Sort by newest updatedAt first
        usort($summaries, function($a, $b) {
            return strtotime($b['updatedAt']) - strtotime($a['updatedAt']);
        });

        echo json_encode([
            'success' => true,
            'calendars' => $summaries
        ]);
        break;

    case 'get':
        $id = $_GET['id'] ?? $inputData['id'] ?? '';
        $found = null;
        foreach ($calendars as $cal) {
            if ($cal['id'] === $id) {
                $found = $cal;
                break;
            }
        }

        if ($found) {
            echo json_encode([
                'success' => true,
                'calendar' => $found
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Calendrier introuvable'
            ]);
        }
        break;

    case 'create':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
            exit;
        }

        $name = trim($inputData['name'] ?? 'Mon Calendrier');
        $author = trim($inputData['author'] ?? 'Étudiant');
        $description = trim($inputData['description'] ?? '');

        $newId = 'cal_' . time() . '_' . substr(md5(uniqid()), 0, 6);
        $now = date('c');

        $selectedKeys = $inputData['selectedCourseKeys'] ?? [];
        $newCal = [
            'id' => $newId,
            'name' => $name,
            'author' => $author,
            'description' => $description,
            'createdAt' => $now,
            'updatedAt' => $now,
            'selectedCourseKeys' => is_array($selectedKeys) ? $selectedKeys : [],
            'categoryOverrides' => $inputData['categoryOverrides'] ?? (object)[],
            'ratings' => $inputData['ratings'] ?? (object)[],
            'comments' => $inputData['comments'] ?? (object)[],
            'customCourses' => $inputData['customCourses'] ?? [],
            'courseCount' => count($selectedKeys),
            'totalCredits' => floatval($inputData['totalCredits'] ?? 0)
        ];

        $calendars[] = $newCal;
        saveCalendars($dataFile, $calendars);

        echo json_encode([
            'success' => true,
            'calendar' => $newCal
        ]);
        break;

    case 'update':
        $id = $_GET['id'] ?? $inputData['id'] ?? '';
        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID de calendrier requis']);
            exit;
        }

        $foundIndex = -1;
        for ($i = 0; $i < count($calendars); $i++) {
            if ($calendars[$i]['id'] === $id) {
                $foundIndex = $i;
                break;
            }
        }

        if ($foundIndex === -1) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Calendrier introuvable pour mise à jour']);
            exit;
        }

        $now = date('c');
        $existing = $calendars[$foundIndex];

        if (isset($inputData['name'])) $existing['name'] = trim($inputData['name']);
        if (isset($inputData['author'])) $existing['author'] = trim($inputData['author']);
        if (isset($inputData['description'])) $existing['description'] = trim($inputData['description']);
        if (isset($inputData['selectedCourseKeys'])) $existing['selectedCourseKeys'] = $inputData['selectedCourseKeys'];
        if (isset($inputData['categoryOverrides'])) $existing['categoryOverrides'] = $inputData['categoryOverrides'];
        if (isset($inputData['ratings'])) $existing['ratings'] = $inputData['ratings'];
        if (isset($inputData['comments'])) $existing['comments'] = $inputData['comments'];
        if (isset($inputData['customCourses'])) $existing['customCourses'] = $inputData['customCourses'];
        if (isset($inputData['totalCredits'])) $existing['totalCredits'] = floatval($inputData['totalCredits']);
        
        $existing['courseCount'] = isset($existing['selectedCourseKeys']) ? count($existing['selectedCourseKeys']) : 0;
        $existing['updatedAt'] = $now;

        $calendars[$foundIndex] = $existing;
        saveCalendars($dataFile, $calendars);

        echo json_encode([
            'success' => true,
            'calendar' => $existing
        ]);
        break;

    case 'delete':
        $id = $_GET['id'] ?? $inputData['id'] ?? '';
        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID requis']);
            exit;
        }

        $filtered = array_filter($calendars, function($cal) use ($id) {
            return $cal['id'] !== $id;
        });

        saveCalendars($dataFile, array_values($filtered));

        echo json_encode([
            'success' => true,
            'message' => 'Calendrier supprimé'
        ]);
        break;

    default:
        echo json_encode([
            'success' => true,
            'api' => 'KU Sejong Hostinger Calendar API',
            'version' => '1.0',
            'endpoints' => [
                'list' => 'GET ?action=list',
                'get' => 'GET ?action=get&id=ID',
                'create' => 'POST ?action=create',
                'update' => 'POST ?action=update&id=ID',
                'delete' => 'POST ?action=delete&id=ID'
            ]
        ]);
        break;
}
