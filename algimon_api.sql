-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 07, 2026 at 03:42 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `algimon_api`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `staff_id` int(11) DEFAULT NULL,
  `property_id` int(11) NOT NULL,
  `service_type` varchar(50) NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `STATUS` enum('pending','approved','confirmed','in-progress','completed','cancelled','rescheduled') DEFAULT 'pending',
  `price_estimate` decimal(10,2) DEFAULT NULL,
  `actual_amount` decimal(10,2) DEFAULT NULL,
  `receipt_no` varchar(50) DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `client_name` varchar(100) DEFAULT NULL,
  `client_email` varchar(100) DEFAULT NULL,
  `client_phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `staff_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`id`, `client_id`, `staff_id`, `property_id`, `service_type`, `appointment_date`, `appointment_time`, `STATUS`, `price_estimate`, `actual_amount`, `receipt_no`, `cancel_reason`, `notes`, `client_name`, `client_email`, `client_phone`, `created_at`, `updated_at`, `staff_name`) VALUES
(3, 16, NULL, 3, 'System Troubleshooting', '2026-05-27', '11:00:00', 'cancelled', NULL, NULL, NULL, 'Schedule conflict', '', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '', '2026-05-02 01:59:31', '2026-05-02 02:12:40', NULL),
(4, 18, NULL, 4, 'Safety Inspections', '2026-05-14', '07:00:00', 'completed', 12345.00, NULL, NULL, 'Budget constraints', '', 'Chloe B', 'chloe@gmail.com', '', '2026-05-02 02:01:56', '2026-05-06 10:28:09', NULL),
(5, 16, NULL, 3, 'Nurse Call Systems', '2026-05-14', '10:00:00', '', NULL, NULL, NULL, 'Schedule conflict', '', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '', '2026-05-02 03:03:33', '2026-05-02 14:06:18', NULL),
(7, 18, NULL, 4, 'System Troubleshooting', '2026-05-13', '07:00:00', 'completed', 23456.00, NULL, NULL, NULL, '', 'Chloe B', 'chloe@gmail.com', '', '2026-05-02 03:11:40', '2026-05-02 14:42:36', NULL),
(8, 16, NULL, 6, 'Safety Inspections', '2026-05-22', '10:00:00', 'completed', 12345.00, NULL, NULL, NULL, '', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '', '2026-05-02 03:56:30', '2026-05-02 14:40:24', NULL),
(10, 21, NULL, 7, 'CCTV Surveillance', '2026-05-15', '09:00:00', 'completed', 1234567.00, NULL, NULL, 'Schedule conflict', '', 'Jane Doe', 'janedoe_algimon@test.com', '', '2026-05-02 06:49:37', '2026-05-05 01:56:54', NULL),
(11, 22, NULL, 8, 'Safety Inspections', '2026-05-05', '07:00:00', 'completed', 34567.00, NULL, NULL, NULL, '', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '', '2026-05-02 07:04:04', '2026-05-02 14:29:02', NULL),
(12, 22, NULL, 8, 'Safety Inspections', '2026-05-15', '07:00:00', 'completed', 99999999.99, NULL, NULL, 'Business closed / relocated', '', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '', '2026-05-02 07:08:49', '2026-05-04 03:39:48', NULL),
(15, 24, NULL, 9, 'Safety Inspections', '2026-05-13', '10:00:00', 'completed', 12300.00, NULL, NULL, NULL, '', 'Chloe Bautista', 'chloechloe070307@gmail.com', '09932712430', '2026-05-05 01:54:14', '2026-05-05 01:55:00', NULL),
(16, 24, NULL, 9, 'Safety Inspections', '2026-05-29', '10:00:00', 'completed', 3000.00, NULL, NULL, NULL, '', 'Chloe Bautista', 'chloechloe070307@gmail.com', '09932712430', '2026-05-05 01:55:30', '2026-05-06 10:28:09', NULL),
(17, 22, NULL, 8, 'Nurse Call Systems', '2026-05-16', '07:00:00', 'completed', 1300.00, NULL, NULL, NULL, 'w', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '09654224851', '2026-05-05 14:41:21', '2026-05-05 14:43:05', NULL),
(18, 22, NULL, 8, 'System Troubleshooting', '2026-05-21', '10:00:00', 'cancelled', 5555.00, NULL, NULL, 'suri', 'AYAW', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '09654224851', '2026-05-05 15:02:21', '2026-05-06 10:28:09', NULL),
(19, 22, NULL, 8, 'Test', '2026-05-12', '08:30:00', 'completed', 9000.00, NULL, NULL, NULL, 'HI', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '09654224851', '2026-05-05 16:24:11', '2026-05-06 10:28:09', NULL),
(21, 22, 5, 8, 'Test', '2026-05-14', '09:00:00', 'completed', 90000.00, 1000000.00, '9876543', 'qwertyu', '', 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '09654224851', '2026-05-05 16:41:51', '2026-05-07 13:25:23', 'Chloe Bautista'),
(22, 0, NULL, 10, 'FDAS Design & Install', '2026-05-26', '11:00:00', 'rescheduled', NULL, NULL, NULL, NULL, '', 'Chesca Bautista', 'chloe07bautista@gmail.com', '09497113830', '2026-05-07 13:30:12', '2026-05-07 13:32:01', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `attendance_status` enum('present','absent','late','on_leave') DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `staff_id`, `staff_name`, `attendance_status`, `remarks`, `date`, `created_at`) VALUES
(2, 3, 'Chesca Bautista', 'present', '', '2026-05-05', '2026-05-05 14:46:46'),
(3, 5, 'Ysamarie Siblero', 'absent', '', '2026-05-05', '2026-05-05 14:46:53'),
(4, 3, 'Chesca Bautista', 'late', '', '2026-05-04', '2026-05-05 14:46:57'),
(5, 5, 'Ysamarie Siblero', 'absent', '', '2026-05-04', '2026-05-05 14:46:59'),
(6, 5, 'Chloe Bautista', 'present', '', '2026-05-07', '2026-05-07 13:25:51');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_name` varchar(255) NOT NULL DEFAULT 'System',
  `action` varchar(100) NOT NULL,
  `entity` varchar(50) NOT NULL DEFAULT 'System',
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_name`, `action`, `entity`, `details`, `created_at`) VALUES
(1, 'Admin User', 'Mark Attendance', 'Staff', 'Chesca Bautista marked as absent', '2026-05-05 11:56:09'),
(2, 'Admin User', 'Mark Attendance', 'Staff', 'Chesca Bautista marked as present', '2026-05-05 11:56:12'),
(3, 'Admin User', 'Export Report', 'System', 'Exported performance report for May 2026 (10 records)', '2026-05-05 12:10:26'),
(4, 'Admin User', 'Export Report', 'System', 'Exported performance report for May 2026 (10 records)', '2026-05-05 12:12:40'),
(5, 'Admin User', 'Export Report', 'System', 'Exported performance report for May 2026 (10 records)', '2026-05-05 12:12:53'),
(6, 'Admin User', 'Export Report', 'System', 'Exported performance report for May 2026 (10 records)', '2026-05-05 12:14:45'),
(7, 'Admin User', 'Export Report', 'System', 'Exported performance report for May 2026 (10 records)', '2026-05-05 12:16:53'),
(8, 'Admin User', 'Export Report', 'System', 'Exported performance report for May 2026 (10 records)', '2026-05-05 12:18:10'),
(9, 'Admin User', 'Login', 'System', 'Admin User logged into the admin panel', '2026-05-05 14:40:44'),
(10, 'Admin User', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 17 for Ysamarie Siblero — Quote: ₱1,300', '2026-05-05 14:41:41'),
(11, 'Admin User', 'Update Status', 'Inquiry', 'Set inquiry 17 to \"in-progress\" for Ysamarie Siblero', '2026-05-05 14:42:56'),
(12, 'Admin User', 'Update Status', 'Inquiry', 'Set inquiry 17 to \"completed\" for Ysamarie Siblero', '2026-05-05 14:43:05'),
(13, 'Admin User', 'Add Staff', 'Staff', 'Added staff member: Ysamarie Siblero', '2026-05-05 14:44:05'),
(14, 'Admin User', 'Logout', 'System', 'Admin logged out', '2026-05-05 14:45:14'),
(15, 'Admin User', 'Login', 'System', 'Admin User logged into the admin panel', '2026-05-05 14:46:19'),
(16, 'Admin User', 'Mark Attendance', 'Staff', 'Chesca Bautista marked as absent', '2026-05-05 14:46:46'),
(17, 'Admin User', 'Mark Attendance', 'Staff', 'Chesca Bautista marked as present', '2026-05-05 14:46:49'),
(18, 'Admin User', 'Mark Attendance', 'Staff', 'Ysamarie Siblero marked as absent', '2026-05-05 14:46:53'),
(19, 'Admin User', 'Mark Attendance', 'Staff', 'Chesca Bautista marked as late', '2026-05-05 14:46:57'),
(20, 'Admin User', 'Mark Attendance', 'Staff', 'Ysamarie Siblero marked as absent', '2026-05-05 14:46:59'),
(21, 'Admin User', 'Update Service', 'Product', 'Updated service: Detectors & Pull Stations', '2026-05-05 14:47:29'),
(22, 'Admin User', 'Add Service', 'Product', 'Added service: Test', '2026-05-05 14:48:39'),
(23, 'Admin User', 'Update Time Slots', 'System', 'Saved time slot config. Active: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday', '2026-05-05 14:49:45'),
(24, 'Admin User', 'Update Staff', 'Staff', 'Updated staff member: Chesca Bautista', '2026-05-05 14:50:46'),
(25, 'Admin User', 'Assign Staff', 'Inquiry', 'Assigned Chesca Bautista to inquiry 18 for Ysamarie Siblero', '2026-05-05 15:02:49'),
(26, 'Admin User', 'Edit Inquiry', 'Inquiry', 'Updated inquiry 18 for Ysamarie Siblero', '2026-05-05 15:03:06'),
(27, 'Admin User', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 18 for Ysamarie Siblero — Quote: ₱5,555', '2026-05-05 15:03:16'),
(28, 'Algimon Admin', 'Login', 'System', 'Algimon Admin logged into the admin panel', '2026-05-05 16:17:01'),
(29, 'Algimon Admin', 'Update Status', 'Inquiry', 'Set inquiry 18 to \"cancelled\" for Ysamarie Siblero', '2026-05-05 16:21:27'),
(30, 'Algimon Admin', 'Assign Staff', 'Inquiry', 'Assigned Chesca Bautista to inquiry 19 for Ysamarie Siblero', '2026-05-05 16:25:18'),
(31, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 19 for Ysamarie Siblero — Quote: ₱9,000', '2026-05-05 16:27:16'),
(32, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 19 for Ysamarie Siblero — Quote: ₱9,000', '2026-05-05 16:27:21'),
(33, 'Algimon Admin', 'Update Status', 'Inquiry', 'Set inquiry 19 to \"in-progress\" for Ysamarie Siblero', '2026-05-05 16:27:49'),
(34, 'Algimon Admin', 'Update Status', 'Inquiry', 'Set inquiry 19 to \"completed\" for Ysamarie Siblero', '2026-05-05 16:28:04'),
(35, 'Algimon Admin', 'Delete Inquiry', 'Inquiry', 'Deleted inquiry ID: 20', '2026-05-05 16:31:49'),
(36, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 21 for Ysamarie Siblero — Quote: ₱90,000', '2026-05-05 16:42:09'),
(37, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 21 for Ysamarie Siblero — Quote: ₱90,000', '2026-05-05 16:42:10'),
(38, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 21 for Ysamarie Siblero — Quote: ₱90,000', '2026-05-05 16:42:12'),
(39, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 21 for Ysamarie Siblero — Quote: ₱90,000', '2026-05-05 16:42:12'),
(40, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 21 for Ysamarie Siblero — Quote: ₱90,000', '2026-05-05 16:42:13'),
(41, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 21 for Ysamarie Siblero — Quote: ₱90,000', '2026-05-05 16:42:15'),
(42, 'Algimon Admin', 'Update Status', 'Inquiry', 'Set inquiry 21 to \"in-progress\" for Ysamarie Siblero', '2026-05-05 16:43:22'),
(43, 'Algimon Admin', 'Login', 'System', 'Algimon Admin logged into the admin panel', '2026-05-06 10:24:32'),
(44, 'Algimon Admin', 'Update Staff', 'Staff', 'Updated staff member: Ysamarie Siblero', '2026-05-06 10:35:04'),
(45, 'Algimon Admin', 'Delete Staff', 'Staff', 'Deleted staff member: Ysamarie Siblero', '2026-05-06 10:35:46'),
(46, 'Algimon Admin', 'Add Staff', 'Staff', 'Added staff member: Chloe Bautista', '2026-05-06 10:36:27'),
(47, 'Chloe Bautista', 'Login', 'System', 'Chloe Bautista logged into the admin panel', '2026-05-06 10:40:20'),
(48, 'Chloe Bautista', 'Logout', 'System', 'Admin logged out', '2026-05-06 10:40:45'),
(49, 'Algimon Admin', 'Login', 'System', 'Algimon Admin logged into the admin panel', '2026-05-06 10:40:57'),
(50, 'Algimon Admin', 'Update Status', 'Inquiry', 'Set inquiry 21 to \"cancelled\" for Ysamarie Siblero', '2026-05-06 10:41:27'),
(51, 'Algimon Admin', 'Update Status', 'Inquiry', 'Set inquiry 21 to \"pending\" for Ysamarie Siblero', '2026-05-06 10:41:32'),
(52, 'Algimon Admin', 'Assign Staff', 'Inquiry', 'Assigned Chloe Bautista to inquiry 21 for Ysamarie Siblero', '2026-05-06 10:41:36'),
(53, 'Chloe Bautista', 'Login', 'System', 'Chloe Bautista logged into the admin panel', '2026-05-06 10:42:08'),
(54, 'Chloe Bautista', 'Login', 'System', 'Chloe Bautista logged into the admin panel', '2026-05-06 10:42:49'),
(55, 'Chloe Bautista', 'Login', 'System', 'Chloe Bautista logged into the admin panel', '2026-05-07 12:40:09'),
(56, 'Algimon Admin', 'Login', 'System', 'Algimon Admin logged into the admin panel', '2026-05-07 12:42:04'),
(57, 'Algimon Admin', 'Assign Staff', 'Inquiry', 'Assigned Chloe Bautista to inquiry 21 for Ysamarie Siblero', '2026-05-07 13:13:16'),
(58, 'Algimon Admin', 'Assign Staff', 'Inquiry', 'Assigned Chloe Bautista to inquiry 21 for Ysamarie Siblero', '2026-05-07 13:13:21'),
(59, 'Algimon Admin', 'Assign Staff', 'Inquiry', 'Assigned Chloe Bautista to inquiry 21 for Ysamarie Siblero', '2026-05-07 13:13:42'),
(60, 'Algimon Admin', 'Assign Staff', 'Inquiry', 'Assigned Chloe Bautista to inquiry 21 for Ysamarie Siblero', '2026-05-07 13:13:48'),
(61, 'Algimon Admin', 'Assign Staff', 'Inquiry', 'Assigned Chloe Bautista to inquiry 21 for Ysamarie Siblero', '2026-05-07 13:15:32'),
(62, 'Algimon Admin', 'Confirm Inquiry', 'Inquiry', 'Confirmed inquiry 21 for Ysamarie Siblero — Quote: ₱90,000', '2026-05-07 13:15:37'),
(63, 'Algimon Admin', 'Mark Attendance', 'Staff', 'Chloe Bautista marked as present', '2026-05-07 13:25:51'),
(64, 'Algimon Admin', 'Mark Attendance', 'Staff', 'Chloe Bautista marked as absent', '2026-05-07 13:26:06'),
(65, 'Algimon Admin', 'Mark Attendance', 'Staff', 'Chloe Bautista marked as present', '2026-05-07 13:26:08'),
(66, 'Algimon Admin', 'Login', 'System', 'Algimon Admin logged into the admin panel', '2026-05-07 13:31:07'),
(67, 'Algimon Admin', 'Update Time Slots', 'System', 'Saved time slot config. Active: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday', '2026-05-07 13:34:59'),
(68, 'Algimon Admin', 'Logout', 'System', 'Admin logged out', '2026-05-07 13:36:10'),
(69, 'Algimon Admin', 'Login', 'System', 'Algimon Admin logged into the admin panel', '2026-05-07 13:36:19');

-- --------------------------------------------------------

--
-- Table structure for table `blocked_dates`
--

CREATE TABLE `blocked_dates` (
  `id` int(11) NOT NULL,
  `blocked_date` date NOT NULL,
  `reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `blocked_dates`
--

INSERT INTO `blocked_dates` (`id`, `blocked_date`, `reason`, `created_at`) VALUES
(3, '2026-12-25', 'Christmas', '2026-05-04 03:30:04'),
(4, '2026-11-01', 'All Saints Day', '2026-05-04 03:30:04'),
(6, '2026-05-15', 'Monthsary', '2026-05-05 08:08:03');

-- --------------------------------------------------------

--
-- Table structure for table `equipment`
--

CREATE TABLE `equipment` (
  `id` int(11) NOT NULL,
  `property_id` int(11) NOT NULL,
  `NAME` varchar(100) NOT NULL,
  `service_type` varchar(50) DEFAULT NULL,
  `last_serviced` date DEFAULT NULL,
  `next_renewal` date DEFAULT NULL,
  `STATUS` enum('active','expired','maintenance') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inquiries`
--

CREATE TABLE `inquiries` (
  `id` int(11) NOT NULL,
  `client_name` varchar(100) NOT NULL,
  `company` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `service_type` varchar(100) DEFAULT NULL,
  `requested_date` date DEFAULT NULL,
  `requested_time` time DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','in-progress','confirmed','cancelled') DEFAULT 'pending',
  `admin_reply` text DEFAULT NULL,
  `replied_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `staff_id` int(11) DEFAULT NULL,
  `staff_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `reference_id`, `is_read`, `created_at`) VALUES
(1, 16, 'appointment_cancelled', 'Appointment Cancelled', 'Your Nurse Call Systems scheduled for May 14, 2026 has been cancelled. Reason: Schedule conflict.', 5, 1, '2026-05-02 11:56:57'),
(2, 16, 'appointment_cancelled', 'Appointment Cancelled', 'Your System Troubleshooting scheduled for May 27, 2026 has been cancelled. Reason: Schedule conflict.', 3, 1, '2026-05-02 10:12:40'),
(7, 16, 'appointment_pending', 'Appointment Submitted', 'Your System Troubleshooting at WHEEWOO on May 6, 2026 at 07:00 AM has been submitted and is awaiting review.', 9, 1, '2026-05-02 14:21:57'),
(9, 16, 'appointment_pending', 'Appointment Submitted', 'Your Safety Inspections at WHEEWOO on May 22, 2026 at 10:00 AM has been submitted and is awaiting review.', 8, 1, '2026-05-02 11:56:30'),
(10, 16, 'appointment_pending', 'Appointment Submitted', 'Your Nurse Call Systems at WHEEWOO on May 30, 2026 at 07:00 AM has been submitted and is awaiting review.', 6, 1, '2026-05-02 11:10:26'),
(137, 21, 'appointment_pending', 'Appointment Submitted', 'Your CCTV Surveillance at Test Building on May 15, 2026 at 09:00 AM has been submitted and is awaiting review.', 10, 0, '2026-05-02 14:49:37'),
(143, 21, 'appointment_cancelled', 'Appointment Cancelled', 'Your CCTV Surveillance scheduled for May 15, 2026 has been cancelled. Reason: Schedule conflict.', 10, 0, '2026-05-02 14:50:20'),
(204, 22, 'appointment_pending', 'Appointment Submitted', 'Your Safety Inspections at Bahay on May 5, 2026 at 07:00 AM has been submitted and is awaiting review.', 11, 1, '2026-05-02 15:04:04'),
(209, 22, 'appointment_pending', 'Appointment Submitted', 'Your Safety Inspections at Bahay on May 15, 2026 at 07:00 AM has been submitted and is awaiting review.', 12, 1, '2026-05-02 15:08:49'),
(215, 22, 'appointment_cancelled', 'Appointment Cancelled', 'Your Safety Inspections scheduled for May 15, 2026 has been cancelled. Reason: Business closed / relocated.', 12, 1, '2026-05-02 15:11:39'),
(223, 22, 'appointment_pending', 'Appointment Submitted', 'Your Safety Inspections at Bahay on May 21, 2026 at 07:00 AM has been submitted and is awaiting review.', 13, 1, '2026-05-02 15:15:31'),
(502, 24, 'appointment_pending', 'Appointment Submitted', 'Your Fire Drill Training at BGC Main Hall 34th Street on May 15, 2026 at 08:00 AM has been submitted and is awaiting review.', 14, 1, '2026-05-02 21:46:04'),
(511, 24, 'appointment_completed', 'Service Completed', 'Your Safety Inspections at BGC Main Hall 34th Street has been completed successfully.', 15, 1, '2026-05-05 09:55:00'),
(512, 24, 'appointment_pending', 'Appointment Submitted', 'Your Safety Inspections at BGC Main Hall 34th Street on May 29, 2026 at 10:00 AM has been submitted and is awaiting review.', 16, 1, '2026-05-05 09:55:30'),
(556, 24, 'appointment_completed', 'Service Completed', 'Your Safety Inspections at BGC Main Hall 34th Street has been completed successfully.', 16, 1, '2026-05-05 10:16:47'),
(578, 22, 'appointment_completed', 'Service Completed', 'Your Safety Inspections at Bahay has been completed successfully.', 12, 1, '2026-05-04 11:39:48'),
(579, 22, 'appointment_completed', 'Service Completed', 'Your Safety Inspections at Bahay has been completed successfully.', 11, 1, '2026-05-02 22:29:02'),
(580, 22, 'appointment_pending', 'Appointment Submitted', 'Your Nurse Call Systems at Bahay on May 16, 2026 at 07:00 AM has been submitted and is awaiting review.', 17, 1, '2026-05-05 22:41:21'),
(589, 22, 'appointment_completed', 'Service Completed', 'Your Nurse Call Systems at Bahay has been completed successfully.', 17, 1, '2026-05-05 22:43:05'),
(652, 22, 'appointment_pending', 'Appointment Submitted', 'Your System Troubleshooting at Bahay on May 22, 2026 at 07:00 AM has been submitted and is awaiting review.', 18, 1, '2026-05-05 23:02:21'),
(761, 22, 'appointment_approved', 'Appointment Confirmed', 'Your System Troubleshooting at Bahay on May 22, 2026 at 07:00 AM has been confirmed. Quoted price: ₱5,555.00.', 18, 1, '2026-05-05 23:03:16'),
(941, 22, 'appointment_cancelled', 'Appointment Cancelled', 'Your System Troubleshooting scheduled for May 21, 2026 has been cancelled. Reason: suri.', 18, 1, '2026-05-06 00:21:22'),
(953, 22, 'appointment_pending', 'Appointment Submitted', 'Your Test at Bahay on May 12, 2026 at 08:30 AM has been submitted and is awaiting review.', 19, 1, '2026-05-06 00:24:11'),
(968, 22, 'appointment_approved', 'Appointment Confirmed', 'Your Test at Bahay on May 12, 2026 at 08:30 AM has been confirmed. Quoted price: ₱9,000.00.', 19, 1, '2026-05-06 00:27:11'),
(973, 22, 'appointment_in_progress', 'Service In Progress', 'Your Test at Bahay is currently underway. Technician on site: Chesca Bautista.', 19, 1, '2026-05-06 00:27:44'),
(978, 22, 'appointment_completed', 'Service Completed', 'Your Test at Bahay has been completed successfully.', 19, 1, '2026-05-06 00:27:59'),
(1048, 22, 'appointment_approved', 'Appointment Confirmed', 'Your Test at Bahay on May 14, 2026 at 09:00 AM has been confirmed. Quoted price: ₱90,000.00.', 21, 0, '2026-05-06 00:42:03'),
(1060, 22, 'appointment_in_progress', 'Service In Progress', 'Your Test at Bahay is currently underway.', 21, 0, '2026-05-06 00:43:18'),
(1108, 0, 'appointment_pending', 'Appointment Submitted', 'Your FDAS Design & Install at 400 J.P Morgan on May 15, 2026 at 09:00 AM has been submitted and is awaiting review.', 22, 0, '2026-05-07 21:30:12');

-- --------------------------------------------------------

--
-- Table structure for table `operation_rules`
--

CREATE TABLE `operation_rules` (
  `id` int(11) NOT NULL,
  `rule_key` varchar(100) NOT NULL,
  `rule_value` text NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `NAME` varchar(100) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `expiry_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `NAME`, `category`, `location`, `quantity`, `expiry_date`, `created_at`) VALUES
(2, 'Fire Extinguiser CHLOE', 'Sprinkler System', 'Taguig City', 89, '2026-05-29', '2026-05-05 08:10:42');

-- --------------------------------------------------------

--
-- Table structure for table `properties`
--

CREATE TABLE `properties` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `NAME` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `property_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `properties`
--

INSERT INTO `properties` (`id`, `user_id`, `NAME`, `address`, `property_type`, `created_at`) VALUES
(3, 16, 'Bahay Ko', '123 Bahay namin', 'Institutional', '2026-05-02 01:58:46'),
(4, 18, 'Office', '123 Bahay namin', 'Commercial', '2026-05-02 02:01:42'),
(6, 16, 'WHEEWOO', '12 jkahska', 'Commercial', '2026-05-02 03:10:04'),
(7, 21, 'Test Building', '123 Rizal Street, Makati City', 'Industrial', '2026-05-02 06:47:54'),
(8, 22, 'Bahay', '123 Bahay namin', 'Residential', '2026-05-02 07:03:52'),
(9, 24, 'BGC Main Hall 34th Street', '4000 A Q34', 'Residential', '2026-05-02 13:45:45'),
(10, 0, '400 J.P Morgan', '400 A Gomez Street 16th I.S.U', 'Residential', '2026-05-07 13:29:52');

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `NAME` varchar(100) NOT NULL,
  `min_price` decimal(10,2) DEFAULT NULL,
  `max_price` decimal(10,2) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `renewable` tinyint(1) DEFAULT 0,
  `renewal_period` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `renewal_value` int(11) DEFAULT NULL,
  `renewal_unit` varchar(20) DEFAULT 'months'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `NAME`, `min_price`, `max_price`, `unit`, `renewable`, `renewal_period`, `created_at`, `renewal_value`, `renewal_unit`) VALUES
(2, 'Detectors & Pull Stations', 3500.00, 5000.00, '/ unit', 0, NULL, '2026-05-04 03:18:30', NULL, 'months'),
(3, 'FDAS Design & Install', 150000.00, 450000.00, '', 0, NULL, '2026-05-04 03:18:30', NULL, 'months'),
(4, 'Fire Alarm Installation', 50000.00, 100000.00, '', 0, NULL, '2026-05-04 03:18:30', NULL, 'months'),
(5, 'Fire Drill Training', 5000.00, 15000.00, '', 0, NULL, '2026-05-04 03:18:30', NULL, 'months'),
(6, 'Fire Extinguisher Check', 900.00, 1500.00, '/ unit', 1, NULL, '2026-05-04 03:18:30', 12, 'months'),
(7, 'Fire Safety Inspection', 5000.00, 20000.00, '', 1, NULL, '2026-05-04 03:18:30', 12, 'months'),
(8, 'Maintenance', 25000.00, 25000.00, '/ month', 1, NULL, '2026-05-04 03:18:30', 1, 'months'),
(9, 'Nurse Call Systems', 50000.00, 150000.00, '', 0, NULL, '2026-05-04 03:18:30', NULL, 'months'),
(10, 'Safety Inspections', 5000.00, 15000.00, '', 1, NULL, '2026-05-04 03:18:30', 12, 'months'),
(11, 'System Troubleshooting', 1500.00, 3500.00, '', 0, NULL, '2026-05-04 03:18:30', NULL, 'months'),
(12, 'Test', 1234.00, 12345.00, '', 1, NULL, '2026-05-05 14:48:39', 10, 'months');

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` int(11) NOT NULL,
  `NAME` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('technician','senior_technician','manager','admin') DEFAULT 'technician',
  `certifications` text DEFAULT NULL,
  `availability` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`availability`)),
  `password_hash` varchar(255) NOT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  `first_login` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `availability_days` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`id`, `NAME`, `email`, `phone`, `role`, `certifications`, `availability`, `password_hash`, `reset_token`, `reset_expires`, `first_login`, `created_at`, `updated_at`, `availability_days`) VALUES
(4, 'Algimon Admin', 'algimonfireprotectionservices@gmail.com', NULL, 'admin', NULL, NULL, '$2y$10$PXY.b9xd5fqZfmbtAoHECuKKlNwbEtuosQpktvrjRqoVlIAvQ.rzK', NULL, NULL, 0, '2026-05-04 09:18:22', '2026-05-06 10:21:39', NULL),
(5, 'Chloe Bautista', 'chloechloe070307@gmail.com', '+63 09932712430', 'technician', '[]', '{\"status\":\"Busy\"}', '$2y$10$scPbNe3q5vi17hQsC6z6l.gIZkyQHOoQNZwQCTjQfr.Efp9YSz3E6', NULL, NULL, 0, '2026-05-06 10:36:22', '2026-05-07 13:25:23', '[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\"]');

-- --------------------------------------------------------

--
-- Table structure for table `time_slots_config`
--

CREATE TABLE `time_slots_config` (
  `id` int(11) NOT NULL,
  `day_of_week` varchar(20) NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `max_slots` int(11) DEFAULT 8
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `time_slots_config`
--

INSERT INTO `time_slots_config` (`id`, `day_of_week`, `is_active`, `start_time`, `end_time`, `max_slots`) VALUES
(1, 'Monday', 1, '09:00:00', '18:00:00', 11),
(2, 'Tuesday', 1, '08:00:00', '17:00:00', 11),
(3, 'Wednesday', 1, '08:00:00', '17:00:00', 9),
(4, 'Thursday', 1, '08:00:00', '17:00:00', 8),
(5, 'Friday', 1, '08:00:00', '17:00:00', 8),
(6, 'Saturday', 1, '09:00:00', '15:00:00', 6),
(7, 'Sunday', 0, '10:00:00', '14:00:00', 4);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `NAME` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_expires` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `NAME`, `email`, `phone`, `password_hash`, `reset_token`, `reset_expires`, `created_at`, `updated_at`) VALUES
(0, 'Chesca Bautista', 'chloe07bautista@gmail.com', '09497113830', '$2y$10$xMNDKu3vaS7oJ2B14Cv4gu0TVtGALSjNHD1nn/nS5P.A5TGjWcJO2', NULL, NULL, '2026-05-07 13:29:02', '2026-05-07 13:29:02'),
(21, 'Jane Doe', 'janedoe_algimon@test.com', '09179876543', '$2y$10$VtQsa1z2HNDT4BIfHYbYfehL.9GA4RuahIvPomiSI1Cpy7XxE2YWy', NULL, NULL, '2026-05-02 06:45:51', '2026-05-02 06:46:37'),
(22, 'Ysamarie Siblero', 'ysamariesiblero@gmail.com', '09654224851', '$2y$10$r7tfTPDcVpHGe2UrWlVaH.CLKYu7xY6qjVbHrVvKc3QHY5HvZHE5i', '244f45d0b66c1ba94ac4f5c81b7983e8e7a2413cfaed6952152a62063a1e83de', '2026-05-02 10:44:40', '2026-05-02 07:03:29', '2026-05-02 08:30:01'),
(23, 'Test User', 'testuser_mobile_test@test.com', '09123456789', '$2y$10$9WPmIN53RAnoCNA/E7pgK.V0Q.AcZM.G8/CbbF8zG2/W0ArdVZHJm', NULL, NULL, '2026-05-02 08:50:05', '2026-05-02 08:50:05');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `staff_id` (`staff_id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_staff_date` (`staff_id`,`date`),
  ADD KEY `idx_att_date` (`date`),
  ADD KEY `idx_att_status` (`attendance_status`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_entity` (`entity`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `blocked_dates`
--
ALTER TABLE `blocked_dates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_blocked_date` (`blocked_date`);

--
-- Indexes for table `equipment`
--
ALTER TABLE `equipment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `property_id` (`property_id`);

--
-- Indexes for table `inquiries`
--
ALTER TABLE `inquiries`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_type_ref` (`user_id`,`type`,`reference_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`);

--
-- Indexes for table `operation_rules`
--
ALTER TABLE `operation_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_rule_key` (`rule_key`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `properties`
--
ALTER TABLE `properties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `time_slots_config`
--
ALTER TABLE `time_slots_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_day` (`day_of_week`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;

--
-- AUTO_INCREMENT for table `blocked_dates`
--
ALTER TABLE `blocked_dates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `equipment`
--
ALTER TABLE `equipment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `inquiries`
--
ALTER TABLE `inquiries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1109;

--
-- AUTO_INCREMENT for table `operation_rules`
--
ALTER TABLE `operation_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `properties`
--
ALTER TABLE `properties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
