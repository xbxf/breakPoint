<?php
//ini_set('display_errors', 'on');
//error_reporting(E_ALL);
header('Content-type: text/plain; charset=utf-8');
$files = $_FILES['theFile'];
$filename = $_REQUEST['filename'];
$total = $_REQUEST['totalSize'];
$isLastChunk = $_REQUEST['isLastChunk'];
$isFitstUpload = $_REQUEST['isFirstUpload'];
if ($files['error'] > 0) {
    $status = 500;
} else {
    if ($isFitstUpload == '1' && file_exists('../uploads/' . $filename) && filesize('../uploads/' . $filename) >= $total) {
        unlink('../uploads/' . $filename);
    }

    if (!file_put_contents('../uploads/' . $filename, file_get_contents($files['tmp_name']), FILE_APPEND)) {
        $status = 501;
    } else {
        if ($isLastChunk === '1') {
            if (filesize('../uploads/' . $filename) == $total) {
                $status = 200;
            } else {
                $status = 502;
            }
        } else {
            $status = 200;
        }
    }
}

echo json_encode([
    'status' => $status,
    'totalSize' => filesize('../uploads/' . $filename),
    'isLastChunk' => $isLastChunk
]);
