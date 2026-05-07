<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

class MailConfig {
    // USING YOUR EMAIL: algimonfire@gmail.com
    private static $host = 'smtp.gmail.com';
    private static $port = 587;
    private static $username = 'algimonfireprotectionservices@gmail.com';     // YOUR EMAIL
    private static $password = 'zzzf vqbu ytwn srug';       // APP PASSWORD (16 chars with spaces)
    private static $fromEmail = 'algimonfireprotectionservices@gmail.com';    // YOUR EMAIL
    private static $fromName = 'Algimon Fire Protection Services';
    
    public static function getMailer() {
        $mail = new PHPMailer(true);
        
        try {
            $mail->SMTPDebug = SMTP::DEBUG_OFF;  // Change to DEBUG_SERVER for testing
            $mail->isSMTP();
            $mail->Host       = self::$host;
            $mail->SMTPAuth   = true;
            $mail->Username   = self::$username;
            $mail->Password   = self::$password;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = self::$port;
            $mail->CharSet    = 'UTF-8';
            $mail->Encoding   = 'base64';
            $mail->setFrom(self::$fromEmail, self::$fromName);
            
            return $mail;
        } catch (Exception $e) {
            error_log("Mailer configuration error: " . $mail->ErrorInfo);
            return null;
        }
    }
}
?>