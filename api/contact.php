<?php
/**
 * Contact & Consultation Form Handler for Integrated Retail (MDDHosting Apache/LiteSpeed)
 * 
 * - Posts entries to WordPress Gravity Forms REST API (cms.integratedretail.com)
 * - Sends immediate email alert via Resend API
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

// Anti-spam honeypot
if (!empty($data['botcheck']) || !empty($data['website_url'])) {
    http_response_code(200);
    echo json_encode(['success' => true, 'note' => 'ignored']);
    exit;
}

// Required fields validation
$email = trim($data['email'] ?? '');
$name = trim($data['name'] ?? '');
$gfFormId = intval($data['form_id'] ?? 1);

if (empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required.']);
    exit;
}

if ($gfFormId !== 100 && empty($name)) {
    http_response_code(400);
    echo json_encode(['error' => 'Name and email are required.']);
    exit;
}

$wpOrigin = 'https://cms.integratedretail.com';
$gfKey = 'ck_e85bf48d0b0695b26a82c0b2f9535853255e5459';
$gfSecret = 'cs_8eed7cce951146dfaccb41945e9f3c26ea33840f';
$resendApiKey = getenv('RESEND_API_KEY') ?: '';
if (!$resendApiKey) {
    foreach ([__DIR__ . '/../.env', __DIR__ . '/../.env.production'] as $envPath) {
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($k, $v) = explode('=', $line, 2);
                    if (trim($k) === 'RESEND_API_KEY') {
                        $resendApiKey = trim($v, " \t\n\r\0\x0B\"'");
                        break 2;
                    }
                }
            }
        }
    }
}

$gfSuccess = false;
$gfEntryId = null;

// 1. Submit entry into WordPress Gravity Forms database
try {
    $gfPayload = [];
    if ($gfFormId === 100) {
        $gfPayload = [
            'form_id' => 100,
            '1' => $name ?: explode('@', $email)[0],
            '10' => $email,
            '14' => '',
            '17' => $data['company'] ?? '',
        ];
    } elseif ($gfFormId === 91) {
        $gfPayload = [
            'form_id' => 91,
            '3' => $name,
            '5' => $data['phone'] ?? '',
            '6' => $email,
            '7' => $data['message'] ?? 'Requested White Paper: Retail Stores in 2025',
            '8' => '',
        ];
    } elseif ($gfFormId === 98) {
        $gfPayload = [
            'form_id' => 98,
            '1' => $name,
            '5' => $data['phone'] ?? '',
            '6' => $email,
            '15' => $data['stores'] ?? '',
            '13' => $data['budget'] ?? '',
            '8' => $data['message'] ?? 'Retail Summit RSVP',
            '10' => '',
        ];
    } else {
        $gfPayload = [
            'form_id' => $gfFormId,
            '1' => $name,
            '10' => $email,
            '16' => $data['phone'] ?? '',
            '8' => $data['country'] ?? '',
            '5' => $data['interest'] ?? '',
            '12' => $data['stores'] ?? '',
            '13' => $data['industry'] ?? '',
            '6' => $data['message'] ?? '',
            '17' => '',
        ];
    }

    $ch = curl_init("$wpOrigin/wp-json/gf/v2/entries");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($gfPayload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Basic ' . base64_encode("$gfKey:$gfSecret"),
        ],
        CURLOPT_TIMEOUT => 15,
    ]);
    $gfRes = curl_exec($ch);
    $gfHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($gfHttpCode >= 200 && $gfHttpCode < 300) {
        $gfResult = json_decode($gfRes, true);
        if (isset($gfResult['id'])) {
            $gfSuccess = true;
            $gfEntryId = $gfResult['id'];
        }
    }
} catch (Exception $e) {
    // Continue to send email even if GF logging fails
}

// 2. Send email via Resend
$recipients = [
    'kamal.lahria@integratedretail.com',
    'bikash.kumar@integratedretail.com',
    'somchai.singh@integratedretail.com',
    'sneha.varma@integratedretail.com',
    'anupama.singal@integratedretail.com',
];

$subject = "New Website Inquiry: " . ($name ?: $email) . " (" . ($data['interest'] ?? 'Consultation') . ")";
$formTitle = "New Consultation Request";

if ($gfFormId === 100) {
    $subject = "[Newsletter] New Subscription: $email";
    $formTitle = "New Newsletter Subscription";
} elseif ($gfFormId === 91) {
    $subject = "[White Paper Request] Cegid Retail 2025: $name ($email)";
    $formTitle = "Cegid White Paper Request";
} elseif ($gfFormId === 98) {
    $subject = "[Event RSVP] Indonesia Retail Summit 2025: $name";
    $formTitle = "Indonesia Retail Summit 2025 RSVP";
}

$safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$safePhone = htmlspecialchars($data['phone'] ?? 'Not provided', ENT_QUOTES, 'UTF-8');
$safeCountry = htmlspecialchars($data['country'] ?? 'Not specified', ENT_QUOTES, 'UTF-8');
$safeInterest = htmlspecialchars($data['interest'] ?? 'General', ENT_QUOTES, 'UTF-8');
$safeStores = htmlspecialchars($data['stores'] ?? 'Not specified', ENT_QUOTES, 'UTF-8');
$safeIndustry = htmlspecialchars($data['industry'] ?? 'Not specified', ENT_QUOTES, 'UTF-8');
$safeSource = htmlspecialchars($data['source'] ?? 'Website Form', ENT_QUOTES, 'UTF-8');
$safeMessage = nl2br(htmlspecialchars($data['message'] ?? 'No additional message provided.', ENT_QUOTES, 'UTF-8'));

$emailHtml = <<<HTML
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: #002b49; padding: 20px 24px;">
    <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">{$formTitle}</h2>
    <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Submitted via integratedretail.com</p>
  </div>
  <div style="padding: 24px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 10px 12px; font-weight: 600; width: 35%; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Full Name</td><td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 500;">{$safeName}</td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Email Address</td><td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;"><a href="mailto:{$safeEmail}" style="color: #2563eb; text-decoration: none;">{$safeEmail}</a></td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Phone</td><td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">{$safePhone}</td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Country</td><td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">{$safeCountry}</td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Interested In</td><td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 500;">{$safeInterest}</td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Number of Stores</td><td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">{$safeStores}</td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Industry</td><td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">{$safeIndustry}</td></tr>
      <tr><td style="padding: 10px 12px; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 13px;">Source</td><td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">{$safeSource}</td></tr>
    </table>
    <div style="margin-top: 20px; background: #f1f5f9; padding: 16px; border-left: 4px solid #002b49; border-radius: 4px;">
      <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Message:</div>
      <div style="margin: 0; font-size: 14px; color: #1e293b;">{$safeMessage}</div>
    </div>
  </div>
</div>
HTML;

$resendPayload = [
    'from' => 'Integrated Retail <website@integratedretail.com>',
    'to' => $recipients,
    'reply_to' => $email,
    'subject' => $subject,
    'html' => $emailHtml,
];

$chResend = curl_init('https://api.resend.com/emails');
curl_setopt_array($chResend, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($resendPayload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Authorization: Bearer $resendApiKey",
    ],
    CURLOPT_TIMEOUT => 15,
]);
$resendRes = curl_exec($chResend);
$resendHttpCode = curl_getinfo($chResend, CURLINFO_HTTP_CODE);
curl_close($chResend);

// Fallback to onboarding domain if domain not yet verified in Resend
if ($resendHttpCode < 200 || $resendHttpCode >= 300) {
    $resendPayload['from'] = 'Integrated Retail Website <onboarding@resend.dev>';
    $resendPayload['to'] = ['yithanglee@gmail.com'];
    $chRetry = curl_init('https://api.resend.com/emails');
    curl_setopt_array($chRetry, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($resendPayload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer $resendApiKey",
        ],
        CURLOPT_TIMEOUT => 15,
    ]);
    curl_exec($chRetry);
    curl_close($chRetry);
}

http_response_code(200);
echo json_encode([
    'success' => true,
    'gf_entry_id' => $gfEntryId,
]);
