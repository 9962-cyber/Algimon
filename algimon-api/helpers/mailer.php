<?php
require_once __DIR__ . '/../config/mail.php';

class MailerHelper {

    // ─────────────────────────────────────────────────────────────────────────
    //  SHARED LAYOUT HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Wraps content in the branded email shell */
    private static function layout(string $preheader, string $body): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Algimon Fire Protection Services</title>
</head>
<body style="margin: 0; padding: 0; background: #f4f5f7; font-family: 'Segoe UI', Arial, sans-serif;">

  <!-- preheader (hidden preview text) -->
  <span style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">{$preheader}</span>

  <!-- outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f4f5f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background: linear-gradient(135deg, #401f1c 0%, #6b2d28 100%); border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-family: 'Segoe UI', Arial, sans-serif;">ALGIMON</h1>
                    <p style="margin: 4px 0 0; color: rgba(255,255,255,0.65); font-size: 11px; letter-spacing: 3px; text-transform: uppercase;">FIRE PROTECTION SERVICES</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background: #ffffff; padding: 40px 40px 32px; border-left: 1px solid #e8e8e8; border-right: 1px solid #e8e8e8;">
              {$body}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background: #f9f9f9; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #999;">This email was sent by Algimon Fire Protection Services.</p>
              <p style="margin: 0 0 6px; font-size: 12px; color: #999;">📍 Need help? Call us at <strong style="color: #df5345;">(02) 852-2302</strong></p>
              <p style="margin: 0; font-size: 11px; color: #bbb;">© 2026 Algimon Fire Protection Services. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    /** Renders a 2-column detail row inside an info table */
    private static function detailRow(string $label, string $value): string {
        return <<<HTML
<tr>
  <td style="padding: 10px 16px; background: #f9f9f9; font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.8px; width: 35%; border-bottom: 1px solid #f0f0f0;">
    {$label}
  </td>
  <td style="padding: 10px 16px; font-size: 14px; color: #222; border-bottom: 1px solid #f0f0f0;">
    {$value}
  </td>
</tr>
HTML;
    }

    /** A coloured status badge */
    private static function statusBadge(string $label, string $color, string $bg): string {
        return "<span style=\"display: inline-block; background: {$bg}; color: {$color}; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 5px 14px; border-radius: 20px; border: 1px solid {$color};\">{$label}</span>";
    }

    /** A solid CTA button */
    private static function ctaButton(string $text, string $url, string $bg = '#df5345'): string {
        return <<<HTML
<table cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto 0;">
  <tr>
    <td style="background: {$bg}; border-radius: 8px; text-align: center;">
      <a href="{$url}" style="display: inline-block; padding: 14px 36px; color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; font-family: 'Segoe UI', Arial, sans-serif;">
        {$text}
      </a>
    </td>
  </tr>
</table>
HTML;
    }

    /** An alert/notice box */
    private static function notice(string $icon, string $text, string $bg, string $border, string $color): string {
        return <<<HTML
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 0;">
  <tr>
    <td style="background: {$bg}; border-left: 4px solid {$border}; border-radius: 0 6px 6px 0; padding: 14px 18px;">
      <p style="margin: 0; font-size: 13px; color: {$color};">{$icon}&nbsp; {$text}</p>
    </td>
  </tr>
</table>
HTML;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  1. APPOINTMENT CONFIRMATION
    // ─────────────────────────────────────────────────────────────────────────

    public static function sendAppointmentConfirmation(string $email, string $clientName, array $d): bool {
        $mail = MailConfig::getMailer();
        if (!$mail) return false;

        $firstName = explode(' ', trim($clientName))[0];
        $badge     = self::statusBadge('Pending Review', '#92400e', '#fffbeb');
        $details   = self::detailRow('Service', htmlspecialchars($d['service_type']))
                   . self::detailRow('Property', htmlspecialchars($d['property_name'] ?? 'N/A'))
                   . self::detailRow('Date', htmlspecialchars(date('F j, Y', strtotime($d['appointment_date']))))
                   . self::detailRow('Time', htmlspecialchars($d['appointment_time']));
        $notice    = self::notice('⚠️', 'Your appointment is awaiting confirmation from our dispatch team. We\'ll notify you once it\'s approved.', '#fffbeb', '#f59e0b', '#92400e');
        $notice   .= self::notice('📋', 'Please ensure someone with property access is available on the scheduled date.', '#eff6ff', '#3b82f6', '#1e40af');

        $body = <<<HTML
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">Appointment Submitted! 🎉</h2>
<p style="margin:0 0 20px;font-size:14px;color:#666;">Hi {$firstName}, your service appointment has been received.</p>
{$badge}

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
  {$details}
</table>

{$notice}

<p style="margin:24px 0 0;font-size:13px;color:#888;text-align:center;">Reference: <strong style="color:#df5345;">#{$d['appointment_id']}</strong> &nbsp;·&nbsp; Submitted on <strong>{$d['submitted_date']}</strong></p>
HTML;

        try {
            $mail->addAddress($email, $clientName);
            $mail->isHTML(true);
            $mail->Subject = '✅ Appointment Submitted — Algimon Fire Protection';
            $mail->Body    = self::layout("Your appointment has been submitted and is pending review.", $body);
            $mail->AltBody = "Hi {$firstName}, your appointment for {$d['service_type']} on {$d['appointment_date']} at {$d['appointment_time']} has been submitted. Ref: #{$d['appointment_id']}";
            $mail->send();
            return true;
        } catch (Exception $e) { return false; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  2. APPOINTMENT CANCELLED (by client)
    // ─────────────────────────────────────────────────────────────────────────

    public static function sendAppointmentCancellation(string $email, string $clientName, array $d): bool {
        $mail = MailConfig::getMailer();
        if (!$mail) return false;

        $firstName = explode(' ', trim($clientName))[0];
        $badge     = self::statusBadge('Cancelled', '#991b1b', '#fee2e2');
        $details   = self::detailRow('Service', htmlspecialchars($d['service_type']))
                   . self::detailRow('Property', htmlspecialchars($d['property_name'] ?? 'N/A'))
                   . self::detailRow('Original Date', htmlspecialchars(date('F j, Y', strtotime($d['appointment_date']))))
                   . self::detailRow('Original Time', htmlspecialchars($d['appointment_time']))
                   . self::detailRow('Reason', htmlspecialchars($d['cancel_reason'] ?? 'Cancelled by client'));
        $cta    = self::ctaButton('Book a New Appointment', 'http://localhost/algimon-frontend/dashboard.html');
        $notice = self::notice('ℹ️', 'Need fire protection services? You can book a new appointment anytime through your client portal.', '#f0f9ff', '#0ea5e9', '#0c4a6e');

        $body = <<<HTML
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">Appointment Cancelled</h2>
<p style="margin:0 0 20px;font-size:14px;color:#666;">Hi {$firstName}, your appointment has been successfully cancelled.</p>
{$badge}

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
  {$details}
</table>

{$notice}
{$cta}

<p style="margin:24px 0 0;font-size:13px;color:#888;text-align:center;">Reference: <strong style="color:#df5345;">#{$d['appointment_id']}</strong> &nbsp;·&nbsp; Cancelled on <strong>{$d['cancelled_date']}</strong></p>
HTML;

        try {
            $mail->addAddress($email, $clientName);
            $mail->isHTML(true);
            $mail->Subject = '❌ Appointment Cancelled — Algimon Fire Protection';
            $mail->Body    = self::layout("Your appointment has been cancelled.", $body);
            $mail->AltBody = "Hi {$firstName}, your appointment for {$d['service_type']} on {$d['appointment_date']} has been cancelled. Reason: {$d['cancel_reason']}";
            $mail->send();
            return true;
        } catch (Exception $e) { return false; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  3. APPOINTMENT RESCHEDULED (by client)
    // ─────────────────────────────────────────────────────────────────────────

    public static function sendAppointmentRescheduled(string $email, string $clientName, array $d): bool {
        $mail = MailConfig::getMailer();
        if (!$mail) return false;

        $firstName = explode(' ', trim($clientName))[0];
        $badge     = self::statusBadge('Rescheduled · Pending', '#92400e', '#fffbeb');
        $details   = self::detailRow('Service', htmlspecialchars($d['service_type']))
                   . self::detailRow('Property', htmlspecialchars($d['property_name'] ?? 'N/A'))
                   . self::detailRow('Previous Date', '<s style="color:#999;">' . htmlspecialchars(date('F j, Y', strtotime($d['old_date']))) . '</s>')
                   . self::detailRow('New Date', '<strong style="color:#16a34a;">' . htmlspecialchars(date('F j, Y', strtotime($d['new_date']))) . '</strong>')
                   . self::detailRow('New Time', '<strong style="color:#16a34a;">' . htmlspecialchars($d['new_time']) . '</strong>');
        $notice = self::notice('✅', 'Your reschedule request has been submitted. Our team will confirm the new date shortly.', '#f0fdf4', '#16a34a', '#14532d');

        $body = <<<HTML
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">Appointment Rescheduled 📅</h2>
<p style="margin:0 0 20px;font-size:14px;color:#666;">Hi {$firstName}, your appointment has been rescheduled to a new date.</p>
{$badge}

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
  {$details}
</table>

{$notice}

<p style="margin:24px 0 0;font-size:13px;color:#888;text-align:center;">Reference: <strong style="color:#df5345;">#{$d['appointment_id']}</strong> &nbsp;·&nbsp; Rescheduled on <strong>{$d['rescheduled_date']}</strong></p>
HTML;

        try {
            $mail->addAddress($email, $clientName);
            $mail->isHTML(true);
            $mail->Subject = '📅 Appointment Rescheduled — Algimon Fire Protection';
            $mail->Body    = self::layout("Your appointment has been rescheduled.", $body);
            $mail->AltBody = "Hi {$firstName}, your appointment for {$d['service_type']} has been rescheduled from {$d['old_date']} to {$d['new_date']} at {$d['new_time']}.";
            $mail->send();
            return true;
        } catch (Exception $e) { return false; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  4. PASSWORD RESET
    // ─────────────────────────────────────────────────────────────────────────

    public static function sendPasswordReset(string $email, string $name, string $resetToken, string $userType = 'client'): bool {
        $mail = MailConfig::getMailer();
        if (!$mail) return false;

        $firstName  = explode(' ', trim($name))[0];
        $resetUrl   = "http://localhost/algimon-frontend/reset-password.html?token={$resetToken}&type={$userType}";
        $cta        = self::ctaButton('Reset My Password', $resetUrl);
        $notice     = self::notice('⏰', 'This link expires in <strong>1 hour</strong>. If you didn\'t request this, you can safely ignore this email — your account remains secure.', '#fff7ed', '#f97316', '#7c2d12');

        $body = <<<HTML
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">Password Reset Request 🔑</h2>
<p style="margin:0 0 24px;font-size:14px;color:#666;">Hi {$firstName}, we received a request to reset your Algimon account password. Click the button below to choose a new one.</p>

{$cta}

{$notice}

<p style="margin:24px 0 0;font-size:12px;color:#aaa;text-align:center;">If the button doesn't work, copy and paste this link into your browser:<br>
<span style="color:#df5345;word-break:break-all;">{$resetUrl}</span></p>
HTML;

        try {
            $mail->addAddress($email, $name);
            $mail->isHTML(true);
            $mail->Subject = '🔑 Reset Your Password — Algimon';
            $mail->Body    = self::layout("Reset your Algimon account password — link expires in 1 hour.", $body);
            $mail->AltBody = "Hi {$firstName}, reset your password here: {$resetUrl} (expires in 1 hour)";
            $mail->send();
            return true;
        } catch (Exception $e) { return false; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  5. STAFF WELCOME
    // ─────────────────────────────────────────────────────────────────────────

    public static function sendStaffWelcomeEmail(string $email, string $name, string $tempPassword): bool {
        $mail = MailConfig::getMailer();
        if (!$mail) return false;

        $firstName = explode(' ', trim($name))[0];
        $loginUrl  = 'http://localhost/algimon-frontend/login.html';
        $cta       = self::ctaButton('Log In to My Account', $loginUrl, '#401f1c');
        $details   = self::detailRow('Email', htmlspecialchars($email))
                   . self::detailRow('Temporary Password', htmlspecialchars($tempPassword));
        $notice    = self::notice('🔐', 'You will be asked to change your password on first login. Please keep your credentials private.', '#eff6ff', '#3b82f6', '#1e40af');

        $body = <<<HTML
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">Welcome to Algimon! 👋</h2>
<p style="margin:0 0 20px;font-size:14px;color:#666;">Hi {$firstName}, your staff account has been created. Here are your login credentials:</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
  {$details}
</table>

{$notice}
{$cta}

<p style="margin:24px 0 0;font-size:12px;color:#aaa;text-align:center;">If you have trouble logging in, contact your administrator.</p>
HTML;

        try {
            $mail->addAddress($email, $name);
            $mail->isHTML(true);
            $mail->Subject = '👋 Welcome to Algimon — Your Staff Account';
            $mail->Body    = self::layout("Your Algimon staff account is ready.", $body);
            $mail->AltBody = "Hi {$firstName}, your Algimon staff account has been created. Login: {$loginUrl} | Temp password: {$tempPassword}";
            $mail->send();
            return true;
        } catch (Exception $e) { return false; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  6. STAFF ASSIGNMENT
    // ─────────────────────────────────────────────────────────────────────────

    public static function sendStaffAssignment(string $email, string $staffName, array $d): bool {
        $mail = MailConfig::getMailer();
        if (!$mail) return false;

        $firstName = explode(' ', trim($staffName))[0];
        $badge     = self::statusBadge('New Assignment', '#1e40af', '#eff6ff');
        $details   = self::detailRow('Service', htmlspecialchars($d['service_type']))
                   . self::detailRow('Date', htmlspecialchars(date('F j, Y', strtotime($d['appointment_date']))))
                   . self::detailRow('Time', htmlspecialchars($d['appointment_time']))
                   . self::detailRow('Client', htmlspecialchars($d['client_name']))
                   . self::detailRow('Property', htmlspecialchars($d['property_name'] ?? 'N/A'))
                   . self::detailRow('Address', htmlspecialchars($d['address'] ?? 'N/A'));
        $notice = self::notice('📋', 'Please review the assignment details and prepare accordingly. Contact dispatch if you need to make any changes.', '#fffbeb', '#f59e0b', '#92400e');

        $body = <<<HTML
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">New Job Assignment 📋</h2>
<p style="margin:0 0 20px;font-size:14px;color:#666;">Hi {$firstName}, you have been assigned to a new service appointment.</p>
{$badge}

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
  {$details}
</table>

{$notice}
HTML;

        try {
            $mail->addAddress($email, $staffName);
            $mail->isHTML(true);
            $mail->Subject = '📋 New Assignment — Algimon';
            $mail->Body    = self::layout("You have a new service assignment.", $body);
            $mail->AltBody = "Hi {$firstName}, you have been assigned to {$d['service_type']} for {$d['client_name']} on {$d['appointment_date']} at {$d['appointment_time']}.";
            $mail->send();
            return true;
        } catch (Exception $e) { return false; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  7. STATUS UPDATE (admin-side changes — approved, completed, etc.)
    // ─────────────────────────────────────────────────────────────────────────

    public static function sendAppointmentStatusUpdate(string $email, string $clientName, array $d, string $oldStatus, string $newStatus): bool {
        $mail = MailConfig::getMailer();
        if (!$mail) return false;

        $firstName  = explode(' ', trim($clientName))[0];
        $statusMap  = [
            'APPROVED'    => ['label' => 'Approved',     'color' => '#166534', 'bg' => '#dcfce7', 'icon' => '✅', 'subject' => '✅ Appointment Approved'],
            'IN_PROGRESS' => ['label' => 'In Progress',  'color' => '#1e40af', 'bg' => '#dbeafe', 'icon' => '🔧', 'subject' => '🔧 Service In Progress'],
            'COMPLETED'   => ['label' => 'Completed',    'color' => '#166534', 'bg' => '#dcfce7', 'icon' => '🎉', 'subject' => '🎉 Service Completed'],
            'CANCELLED'   => ['label' => 'Cancelled',    'color' => '#991b1b', 'bg' => '#fee2e2', 'icon' => '❌', 'subject' => '❌ Appointment Cancelled'],
            'RESCHEDULED' => ['label' => 'Rescheduled',  'color' => '#92400e', 'bg' => '#fffbeb', 'icon' => '📅', 'subject' => '📅 Appointment Rescheduled'],
        ];
        $ns    = strtoupper($newStatus);
        $s     = $statusMap[$ns] ?? ['label' => $newStatus, 'color' => '#374151', 'bg' => '#f3f4f6', 'icon' => 'ℹ️', 'subject' => "Appointment Update"];
        $badge = self::statusBadge($s['label'], $s['color'], $s['bg']);

        $details = self::detailRow('Service', htmlspecialchars($d['service_type']))
                 . self::detailRow('Property', htmlspecialchars($d['property_name'] ?? 'N/A'))
                 . self::detailRow('Date', htmlspecialchars(date('F j, Y', strtotime($d['appointment_date']))))
                 . self::detailRow('Time', htmlspecialchars($d['appointment_time']))
                 . ($d['staff_name'] ? self::detailRow('Technician', htmlspecialchars($d['staff_name'])) : '');

        $ctaLine = $ns === 'COMPLETED'
            ? self::notice('⭐', 'Thank you for choosing Algimon Fire Protection Services! Your safety is our priority.', '#f0fdf4', '#16a34a', '#14532d')
            : '';

        $body = <<<HTML
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">{$s['icon']} Appointment {$s['label']}</h2>
<p style="margin:0 0 20px;font-size:14px;color:#666;">Hi {$firstName}, your appointment status has been updated.</p>
{$badge}

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;">
  {$details}
</table>

{$ctaLine}

<p style="margin:24px 0 0;font-size:13px;color:#888;text-align:center;">Reference: <strong style="color:#df5345;">#{$d['appointment_id']}</strong></p>
HTML;

        try {
            $mail->addAddress($email, $clientName);
            $mail->isHTML(true);
            $mail->Subject = $s['subject'] . ' — Algimon Fire Protection';
            $mail->Body    = self::layout("Your appointment status: {$s['label']}.", $body);
            $mail->AltBody = "Hi {$firstName}, your appointment for {$d['service_type']} on {$d['appointment_date']} is now {$s['label']}.";
            $mail->send();
            return true;
        } catch (Exception $e) { return false; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  8. CLIENT WELCOME (new registration)
    // ─────────────────────────────────────────────────────────────────────────

    public static function sendClientWelcomeEmail(string $email, string $name): bool {
        $mail = MailConfig::getMailer();
        if (!$mail) return false;

        $firstName = explode(' ', trim($name))[0];
        $portalUrl = 'http://localhost/algimon-frontend/dashboard.html';
        $cta       = self::ctaButton('Go to My Dashboard', $portalUrl, '#401f1c');
        $notice    = self::notice('🔥', 'You can now schedule fire safety inspections, track your equipment compliance, and manage your properties — all in one place.', '#fff8f6', '#df5345', '#7f1d1d');

        $body = <<<HTML
<h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a1a;">Welcome to Algimon! 🎉</h2>
<p style="margin:0 0 20px;font-size:14px;color:#666;">Hi {$firstName}, your client account has been successfully created. You're now part of the Algimon Fire Protection Services portal.</p>

{$notice}
{$cta}

<p style="margin:24px 0 0;font-size:12px;color:#aaa;text-align:center;">If you have any questions, call us at <strong style="color:#df5345;">(02) 852-2302</strong> or reply to this email.</p>
HTML;

        try {
            $mail->addAddress($email, $name);
            $mail->isHTML(true);
            $mail->Subject = '🎉 Welcome to Algimon — Your Account is Ready';
            $mail->Body    = self::layout("Your Algimon client account has been created. Start managing your fire safety appointments today.", $body);
            $mail->AltBody = "Hi {$firstName}, welcome to Algimon! Your client account is ready. Visit your dashboard: {$portalUrl}";
            $mail->send();
            return true;
        } catch (Exception $e) { return false; }
    }
}
?>