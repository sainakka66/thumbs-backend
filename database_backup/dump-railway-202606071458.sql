-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: tramway.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_lockouts`
--

DROP TABLE IF EXISTS `account_lockouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_lockouts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locked_until` datetime NOT NULL,
  `reason` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lockouts_username` (`username`,`locked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account_lockouts`
--

LOCK TABLES `account_lockouts` WRITE;
/*!40000 ALTER TABLE `account_lockouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `account_lockouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_action_approvals`
--

DROP TABLE IF EXISTS `admin_action_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_action_approvals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `action_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_ref` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `payload` json DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_approvals_status` (`status`),
  KEY `idx_admin_approvals_action` (`action_type`,`target_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_action_approvals`
--

LOCK TABLES `admin_action_approvals` WRITE;
/*!40000 ALTER TABLE `admin_action_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_action_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_audit_logs`
--

DROP TABLE IF EXISTS `admin_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_user_id` int NOT NULL,
  `action` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_admin` (`admin_user_id`),
  KEY `idx_admin_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_audit_logs`
--

LOCK TABLES `admin_audit_logs` WRITE;
/*!40000 ALTER TABLE `admin_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_request_logs`
--

DROP TABLE IF EXISTS `api_request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_request_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `request_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_code` int DEFAULT NULL,
  `duration_ms` int unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_logs_request` (`request_id`),
  KEY `idx_api_logs_user` (`user_id`),
  KEY `idx_api_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_request_logs`
--

LOCK TABLES `api_request_logs` WRITE;
/*!40000 ALTER TABLE `api_request_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_request_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `before_value` json DEFAULT NULL,
  `after_value` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_action_created` (`action`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.199.38.3',NULL,NULL,'2026-05-29 19:57:56'),(2,3,'manager_sai','login','user','3',NULL,'{\"username\": \"manager_sai\"}','10.199.38.3',NULL,NULL,'2026-05-29 19:57:58'),(3,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.194.140.3',NULL,NULL,'2026-05-29 20:18:45'),(4,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','127.0.0.1',NULL,NULL,'2026-05-29 20:37:01'),(5,2,'admin_sai','logout','user','2',NULL,NULL,'10.197.137.129',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-29 20:55:35'),(6,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.104.131',NULL,NULL,'2026-05-29 20:55:57'),(7,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.104.131',NULL,NULL,'2026-05-29 21:00:53'),(8,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.194.140.3',NULL,NULL,'2026-05-29 21:28:17'),(9,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.194.140.3',NULL,NULL,'2026-05-29 21:31:49'),(10,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.104.131',NULL,NULL,'2026-05-29 21:41:44'),(11,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.86.2',NULL,NULL,'2026-05-29 21:44:27'),(12,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.194.200.4',NULL,NULL,'2026-05-29 21:45:11'),(13,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.197.119.131',NULL,NULL,'2026-05-29 21:46:02'),(14,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.197.132',NULL,NULL,'2026-05-29 21:46:57'),(15,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.194.250.2',NULL,NULL,'2026-05-29 21:47:29'),(16,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 03:25:16'),(17,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-30 03:52:46'),(18,2,'admin_sai','logout','user','2',NULL,NULL,'10.192.193.130','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 03:54:29'),(19,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-30 03:54:34'),(20,2,'admin_sai','user_password_reset','user','6',NULL,'{\"username\": \"customer_sai\"}','27.6.44.201','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 03:56:53'),(21,2,'admin_sai','user_update','user','6','{\"email\": null, \"phone\": null, \"role_slug\": \"CUSTOMER\"}','{\"email\": \"customer@gmail.com\", \"phone\": \"\", \"role_slug\": \"CUSTOMER\"}','27.6.44.201','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 03:56:58'),(22,2,'admin_sai','logout','user','2',NULL,NULL,'10.192.208.4','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 03:57:07'),(23,6,'customer_sai','login','user','6',NULL,'{\"username\": \"customer_sai\"}','10.192.193.130',NULL,NULL,'2026-05-30 03:57:31'),(24,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.81.130',NULL,NULL,'2026-05-30 06:50:46'),(25,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.111.132',NULL,NULL,'2026-05-30 07:46:23'),(26,2,'admin_sai','inventory_create','inventory','7',NULL,'{\"sku\": \"TU-697\", \"Name\": \"Thumbs up\", \"quantity\": 30}','10.195.111.132','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 07:47:30'),(27,2,'admin_sai','sale_create','sale',NULL,NULL,'{\"customer_id\": \"7\", \"product_name\": \"THUMBS UP (300)\", \"total_amount\": 2697}','10.192.193.130','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 07:48:47'),(28,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.111.132',NULL,NULL,'2026-05-30 11:16:55'),(29,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.111.132',NULL,NULL,'2026-05-30 14:04:46'),(30,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.111.132',NULL,NULL,'2026-05-30 14:27:12'),(31,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-30 14:27:52'),(32,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 14:28:50'),(33,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 14:36:41'),(34,2,'admin_sai','logout','user','2',NULL,NULL,'10.195.81.130','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 14:37:04'),(35,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 14:37:10'),(36,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.197.132',NULL,NULL,'2026-05-30 14:55:40'),(37,2,'admin_sai','customer_create','customer','8',NULL,'{\"shop_name\": \"PM Test Shop\"}','10.195.197.132',NULL,'node','2026-05-30 14:55:52'),(38,2,'admin_sai','customer_update','customer','8','{\"id\": 8, \"area\": \"Test\", \"email\": null, \"phone\": \"9000000099\", \"address\": null, \"shop_name\": \"PM Test Shop\", \"owner_name\": \"PM Tester\", \"credit_limit\": \"10000.00\", \"opening_balance\": \"0.00\", \"outstanding_balance\": \"0.00\"}','{\"phone\": \"9000000099\", \"shop_name\": \"PM Test Shop 2\"}','10.195.197.132',NULL,'node','2026-05-30 14:55:53'),(39,2,'admin_sai','inventory_create','inventory','8',NULL,'{\"sku\": \"PM-TEST\", \"Name\": \"PM Test Cola\", \"quantity\": 50}','10.195.197.132',NULL,'node','2026-05-30 14:55:53'),(40,2,'admin_sai','inventory_update','inventory','8','{\"id\": 8, \"bpc\": 24, \"sku\": \"PM-TEST\", \"Name\": \"PM Test Cola\", \"size\": \"300ml\", \"price\": \"100.00\", \"reorder\": \"5.00\", \"category\": \"Cola\", \"quantity\": \"50.00\"}','{\"sku\": \"PM-TEST\", \"Name\": \"PM Test Cola\", \"price\": 110, \"quantity\": 60}','10.195.197.132',NULL,'node','2026-05-30 14:55:54'),(41,2,'admin_sai','sale_create','sale',NULL,NULL,'{\"customer_id\": 8, \"product_name\": \"PM Test Cola\", \"total_amount\": 110}','10.195.197.132',NULL,'node','2026-05-30 14:55:54'),(42,2,'admin_sai','delivery_create','delivery','8',NULL,'{\"status\": \"Pending\", \"customer_id\": 8, \"product_name\": \"PM Test Cola\"}','10.195.197.132',NULL,'node','2026-05-30 14:55:55'),(43,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 14:56:41'),(44,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-30 15:14:25'),(45,2,'admin_sai','customer_create','customer','9',NULL,'{\"shop_name\": \"Sri Sai Provisions\"}','10.195.197.132',NULL,'PostmanRuntime/7.54.0','2026-05-30 15:18:13'),(46,2,'admin_sai','customer_update','customer','7','{\"id\": 7, \"area\": \"EAST\", \"email\": \"kiran@gmail.com\", \"phone\": \"6663334646\", \"address\": \"KPD\", \"shop_name\": \"KIRAN STORES\", \"owner_name\": \"KIRAN\", \"credit_limit\": \"10000.00\", \"opening_balance\": \"1000.00\", \"outstanding_balance\": \"697.00\"}','{\"phone\": \"9876543210\", \"shop_name\": \"Sri Sai Super Provisions\"}','10.195.197.132',NULL,'PostmanRuntime/7.54.0','2026-05-30 15:20:15'),(47,2,'admin_sai','customer_create','customer','10',NULL,'{\"shop_name\": \"SAI AGENCIES\"}','10.195.81.130',NULL,'PostmanRuntime/7.54.0','2026-05-30 15:34:06'),(48,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.81.130',NULL,NULL,'2026-05-30 15:40:28'),(49,2,'admin_sai','logout','user','2',NULL,NULL,'10.192.193.130','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 15:45:36'),(50,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.81.130',NULL,NULL,'2026-05-30 15:45:42'),(51,2,'admin_sai','logout','user','2',NULL,NULL,'10.195.197.132','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-30 16:02:53'),(52,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.81.130',NULL,NULL,'2026-05-30 16:02:58'),(53,1,'admin','login','user','1',NULL,'{\"username\": \"admin\"}','10.192.208.4',NULL,NULL,'2026-05-30 16:53:28'),(54,1,'admin','login','user','1',NULL,'{\"username\": \"admin\"}','10.192.193.130',NULL,NULL,'2026-05-30 17:23:08'),(55,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 17:25:44'),(56,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 17:26:45'),(57,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 17:27:08'),(58,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.197.132',NULL,NULL,'2026-05-30 17:28:22'),(59,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.111.132',NULL,NULL,'2026-05-30 17:44:19'),(60,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.197.132',NULL,NULL,'2026-05-30 17:49:33'),(61,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-30 18:26:58'),(62,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-30 18:30:57'),(63,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-30 18:36:41'),(64,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-31 03:49:27'),(65,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.81.130',NULL,NULL,'2026-05-31 03:55:33'),(66,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.197.132',NULL,NULL,'2026-05-31 03:56:30'),(67,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-31 04:06:57'),(68,2,'admin_sai','logout','user','2',NULL,NULL,'10.195.197.132','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 04:10:33'),(69,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.81.130',NULL,NULL,'2026-05-31 04:10:46'),(70,2,'admin_sai','logout','user','2',NULL,NULL,'10.195.81.130','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 04:10:53'),(71,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.81.130',NULL,NULL,'2026-05-31 04:11:04'),(72,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-31 05:57:04'),(73,2,'admin_sai','delivery_updated','delivery','6','{\"id\": 6, \"notes\": null, \"status\": \"Pending\", \"quantity\": 1, \"vehicle_no\": null, \"customer_id\": 1, \"driver_name\": null, \"product_name\": \"x\", \"delivery_date\": null, \"assigned_user_id\": null}','{\"status\": \"Scheduled\"}','202.65.158.162','fp_vz8iq3','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 05:58:16'),(74,2,'admin_sai','delivery_updated','delivery','6','{\"id\": 6, \"notes\": null, \"status\": \"Scheduled\", \"quantity\": 1, \"vehicle_no\": null, \"customer_id\": 1, \"driver_name\": null, \"product_name\": \"x\", \"delivery_date\": null, \"assigned_user_id\": null}','{\"status\": \"In Transit\"}','202.65.158.162','fp_vz8iq3','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 05:58:25'),(75,2,'admin_sai','delivery_completed','delivery','6','{\"id\": 6, \"notes\": null, \"status\": \"In Transit\", \"quantity\": 1, \"vehicle_no\": null, \"customer_id\": 1, \"driver_name\": null, \"product_name\": \"x\", \"delivery_date\": null, \"assigned_user_id\": null}','{\"status\": \"Completed\"}','202.65.158.162','fp_vz8iq3','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 05:58:28'),(76,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-31 07:00:39'),(77,2,'admin_sai','inventory_create','inventory','9',NULL,'{\"sku\": \"KL-899\", \"Name\": \"Kinley\", \"quantity\": 5}','10.195.197.132','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 07:13:20'),(78,2,'admin_sai','inventory_create','inventory','10',NULL,'{\"sku\": \"FT-798\", \"Name\": \"Fanta\", \"quantity\": 10}','10.195.197.132','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 07:14:17'),(79,2,'admin_sai','inventory_create','inventory','11',NULL,'{\"sku\": \"CC-567\", \"Name\": \"Cocola\", \"quantity\": 15}','10.195.81.130','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 07:15:12'),(80,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.197.132',NULL,NULL,'2026-05-31 08:12:47'),(81,6,'customer_sai','login','user','6',NULL,'{\"username\": \"customer_sai\"}','10.195.197.132',NULL,NULL,'2026-05-31 10:25:05'),(82,6,'customer_sai','logout','user','6',NULL,NULL,'10.195.81.130','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 10:25:13'),(83,6,'customer_sai','login','user','6',NULL,'{\"username\": \"customer_sai\"}','10.195.81.130',NULL,NULL,'2026-05-31 10:25:18'),(84,6,'customer_sai','logout','user','6',NULL,NULL,'10.195.197.132','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 10:25:40'),(85,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.197.132',NULL,NULL,'2026-05-31 10:25:47'),(86,2,'admin_sai','logout','user','2',NULL,NULL,'10.195.197.132','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 10:25:56'),(87,6,'customer_sai','login','user','6',NULL,'{\"username\": \"customer_sai\"}','10.195.197.132',NULL,NULL,'2026-05-31 10:26:04'),(88,6,'customer_sai','logout','user','6',NULL,NULL,'10.195.111.134','fp_9zl5ek','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 10:26:54'),(89,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.111.134',NULL,NULL,'2026-05-31 10:27:31'),(90,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.111.134',NULL,NULL,'2026-05-31 13:52:05'),(91,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.193.130',NULL,NULL,'2026-05-31 13:54:40'),(92,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.192.208.4',NULL,NULL,'2026-05-31 13:56:56'),(93,2,'admin_sai','logout','user','2',NULL,NULL,'10.192.193.130','fp_708d8223','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 14:18:29'),(94,2,'admin_sai','logout','user','2',NULL,NULL,'10.195.197.132','fp_708d8223','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 14:18:48'),(95,2,'admin_sai','login','user','2',NULL,'{\"username\": \"admin_sai\"}','10.195.81.130',NULL,NULL,'2026-05-31 14:27:15'),(96,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"OS\", \"browser\": \"Browser\", \"fingerprint\": \"hotfix-verify-1780241311614\"}','27.6.44.201','hotfix-verify-1780241311614','node','2026-05-31 15:28:35'),(97,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"OS\", \"browser\": \"Browser\", \"fingerprint\": \"hotfix-verify-1780241311614\"}','27.6.44.201','hotfix-verify-1780241311614','node','2026-05-31 15:28:37'),(98,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"Windows\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_708d8223\"}','27.6.44.201','fp_708d8223','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 15:32:00'),(99,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','27.6.44.201','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 15:34:21'),(100,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','27.6.44.201','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 15:47:17'),(101,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"Windows\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_708d8223\"}','27.6.44.201','fp_708d8223','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 15:54:44'),(102,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','152.59.203.220','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-06-01 04:16:21'),(103,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-06-02 12:00:08'),(104,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-06-02 12:04:45'),(105,NULL,NULL,'device.new.detected','security','2',NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-06-02 12:09:08');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blocked_devices`
--

DROP TABLE IF EXISTS `blocked_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blocked_devices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blocked_by` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blocked_devices_fp` (`device_fingerprint`),
  KEY `idx_blocked_devices_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blocked_devices`
--

LOCK TABLES `blocked_devices` WRITE;
/*!40000 ALTER TABLE `blocked_devices` DISABLE KEYS */;
/*!40000 ALTER TABLE `blocked_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blocked_entities`
--

DROP TABLE IF EXISTS `blocked_entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blocked_entities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entity_type` enum('user','device','ip','customer','distributor','vpa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blocked_by` int DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blocked_entity` (`entity_type`,`entity_value`),
  KEY `idx_blocked_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blocked_entities`
--

LOCK TABLES `blocked_entities` WRITE;
/*!40000 ALTER TABLE `blocked_entities` DISABLE KEYS */;
/*!40000 ALTER TABLE `blocked_entities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collections`
--

DROP TABLE IF EXISTS `collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` enum('cash','upi','bank_transfer','cheque') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_no` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collected_by` int DEFAULT NULL,
  `collected_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reconciled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_collections_customer` (`customer_id`,`collected_at`),
  KEY `idx_collections_method` (`payment_method`),
  KEY `fk_collections_collector` (`collected_by`),
  CONSTRAINT `fk_collections_collector` FOREIGN KEY (`collected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_collections_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collections`
--

LOCK TABLES `collections` WRITE;
/*!40000 ALTER TABLE `collections` DISABLE KEYS */;
/*!40000 ALTER TABLE `collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shop_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `area` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_limit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `opening_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `outstanding_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_customers_shop_name` (`shop_name`),
  KEY `idx_customers_area` (`area`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'VAISHNAVI','APPALARAJU','9949244418','sainakka@gmail.com','KPD','EAST',1111.00,1000.00,0.00),(2,'QA Shop 1779972775343','QA Owner','9999999999','qa1779972775343@test.com','QA Street','North',50000.00,0.00,0.00),(3,'QA Shop 1779972856224','QA Owner','9999999999','qa1779972856224@test.com','QA Street','North',50000.00,0.00,0.00),(4,'QA Shop 1779973140281','QA Owner','9999999999','qa1779973140281@test.com','QA Street','North',50000.00,0.00,0.00),(5,'QA Shop 1779973251995','QA Owner','9999999999','qa1779973251995@test.com','QA Street','North',50000.00,0.00,0.00),(6,'VISHNAVI','RAMANA','9346376966','ramana@gmail.com','KPD','EAST',1000.00,1000.00,0.00),(7,'Sri Sai Super Provisions','Ramesh Kumar','9876543210','srisai@example.com','12 Market Road, Hyderabad','Ameerpet',75000.00,1000.00,0.00),(9,'Sri Sai Provisions','Ramesh Kumar','9876543210','srisai@example.com','12 Market Road, Hyderabad','Ameerpet',50000.00,0.00,0.00),(10,'SAI AGENCIES','Ramesh','9876543210','saiagencies@example.com','12 Market Road, Hyderabad','KPD',50000.00,0.00,0.00);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `deliveries`
--

DROP TABLE IF EXISTS `deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deliveries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `assigned_user_id` int DEFAULT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `delivery_date` date DEFAULT NULL,
  `driver_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_no` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_deliveries_customer_id` (`customer_id`),
  KEY `idx_deliveries_status` (`status`),
  KEY `idx_deliveries_delivery_date` (`delivery_date`),
  CONSTRAINT `fk_deliveries_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `deliveries`
--

LOCK TABLES `deliveries` WRITE;
/*!40000 ALTER TABLE `deliveries` DISABLE KEYS */;
INSERT INTO `deliveries` VALUES (1,1,NULL,'1',23,'2026-05-28','SAI','AP-7A-1179','Delivered',''),(2,2,NULL,'QA Beer 1779972775343',2,'2026-05-28','QA Driver','QA-001','Pending','E2E delivery'),(3,3,NULL,'QA Beer 1779972856224',2,'2026-05-28','QA Driver','QA-001','Pending','E2E delivery'),(4,4,NULL,'QA Beer 1779973140281',2,'2026-05-28','QA Driver','QA-001','Pending','E2E delivery'),(5,5,NULL,'QA Beer 1779973251995',2,'2026-05-28','QA Driver','QA-001','Pending','E2E delivery'),(6,1,NULL,'x',1,NULL,NULL,NULL,'Completed',NULL),(7,7,NULL,'THUMBS UP (300)',20,'2026-05-29','APPANA','AP-7Y-8899','Delivered','');
/*!40000 ALTER TABLE `deliveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_sessions`
--

DROP TABLE IF EXISTS `device_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `browser_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `language` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geo_country` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geo_region` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_emulator` tinyint(1) NOT NULL DEFAULT '0',
  `is_headless` tinyint(1) NOT NULL DEFAULT '0',
  `trust_score` decimal(5,2) NOT NULL DEFAULT '50.00',
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_sessions_user_fp` (`user_id`,`device_fingerprint`),
  KEY `idx_device_sessions_fp` (`device_fingerprint`),
  CONSTRAINT `fk_device_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_sessions`
--

LOCK TABLES `device_sessions` WRITE;
/*!40000 ALTER TABLE `device_sessions` DISABLE KEYS */;
INSERT INTO `device_sessions` VALUES (1,2,'fp_9zl5ek',NULL,'Android',NULL,'en-US','27.6.44.201',NULL,NULL,0,0,50.00,'2026-05-30 15:41:44','2026-05-30 07:50:32');
/*!40000 ALTER TABLE `device_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `distributors`
--

DROP TABLE IF EXISTS `distributors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `distributors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gstin` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','suspended','banned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_distributors_code` (`code`),
  KEY `idx_distributors_user` (`user_id`),
  KEY `idx_distributors_status` (`status`),
  CONSTRAINT `fk_distributors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `distributors`
--

LOCK TABLES `distributors` WRITE;
/*!40000 ALTER TABLE `distributors` DISABLE KEYS */;
/*!40000 ALTER TABLE `distributors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feature_flags`
--

DROP TABLE IF EXISTS `feature_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feature_flags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `flag_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `config` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feature_flags_key` (`flag_key`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_flags`
--

LOCK TABLES `feature_flags` WRITE;
/*!40000 ALTER TABLE `feature_flags` DISABLE KEYS */;
INSERT INTO `feature_flags` VALUES (1,'notify_whatsapp',0,'{\"provider\": \"none\"}','2026-05-31 15:27:42'),(2,'notify_sms',0,'{\"provider\": \"none\"}','2026-05-31 15:27:42'),(3,'notify_email',0,'{\"provider\": \"none\"}','2026-05-31 15:27:42');
/*!40000 ALTER TABLE `feature_flags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Product name — capital N matches server.js',
  `quantity` decimal(12,2) DEFAULT '0.00',
  `price` decimal(12,2) DEFAULT '0.00',
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bpc` int unsigned DEFAULT '24',
  `reorder` decimal(12,2) DEFAULT '10.00',
  PRIMARY KEY (`id`),
  KEY `idx_inventory_sku` (`sku`),
  KEY `idx_inventory_name` (`Name`),
  KEY `idx_inventory_qty_reorder` (`quantity`,`reorder`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
INSERT INTO `inventory` VALUES (1,'THUMBS UP',2.00,899.00,'TU-300','Cola','300',24,10.00),(6,'Thumbs Up',2.00,1000.00,'TU-600','Cola','1000',24,10.00),(9,'Kinley',5.00,299.00,'KL-899','Other','1 ltr',18,10.00),(10,'Fanta',10.00,899.00,'FT-798','Other','1 ltr',20,10.00),(11,'Cocola',15.00,699.00,'CC-567','Cola','1 ltr',18,10.00);
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT '0',
  `failure_reason` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `risk_score` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_user` (`username`,`created_at`),
  KEY `idx_login_attempts_ip` (`ip_address`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempts`
--

LOCK TABLES `login_attempts` WRITE;
/*!40000 ALTER TABLE `login_attempts` DISABLE KEYS */;
INSERT INTO `login_attempts` VALUES (1,'admin_sai',2,'27.6.44.201','hotfix-verify-1780241311614','node',1,NULL,0.00,'2026-05-31 15:28:35'),(2,'admin_sai',2,'27.6.44.201','hotfix-verify-1780241311614','node',1,NULL,0.00,'2026-05-31 15:28:37'),(3,'admin_sai',2,'27.6.44.201','fp_708d8223','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',1,NULL,0.00,'2026-05-31 15:32:00'),(4,'admin_sai',2,'27.6.44.201',NULL,'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',1,NULL,0.00,'2026-05-31 15:34:13'),(5,'admin_sai',2,'27.6.44.201','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',1,NULL,0.00,'2026-05-31 15:34:21'),(6,'admin_sai',2,'27.6.44.201','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',1,NULL,0.00,'2026-05-31 15:47:17'),(7,'admin_sai',2,'27.6.44.201','fp_708d8223','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',1,NULL,0.00,'2026-05-31 15:54:44'),(8,'admin_sai',2,'152.59.203.220','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',1,NULL,0.00,'2026-06-01 04:16:21'),(9,'admin_sai',2,'152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',1,NULL,0.00,'2026-06-02 12:00:08'),(10,'admin_sai',2,'152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',1,NULL,0.00,'2026-06-02 12:04:45'),(11,'admin_sai',2,'152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',1,NULL,0.00,'2026-06-02 12:09:08');
/*!40000 ALTER TABLE `login_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL COMMENT 'NULL = broadcast to all with permission',
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `entity_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`),
  KEY `idx_notifications_created` (`created_at`),
  KEY `idx_notifications_type` (`type`),
  KEY `idx_notifications_read` (`is_read`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,NULL,'low_stock','Low stock alert','THUMBS UP is at 5.00 cases (threshold 10.00)','inventory','1',0,NULL,'2026-05-29 21:44:29'),(2,NULL,'low_stock','Low stock alert','Thumbs Up is at 5.00 cases (threshold 10.00)','inventory','6',0,NULL,'2026-05-29 21:44:30'),(3,NULL,'new_sale','New sale','Sale of ₹ 2697 — THUMBS UP (300)','sale',NULL,1,'2026-05-30 14:55:52','2026-05-30 07:48:47'),(4,NULL,'customer_added','New customer','Customer PM Test Shop added','customer','8',0,NULL,'2026-05-30 14:55:52'),(5,NULL,'new_sale','New sale','Sale of ₹ 110 — PM Test Cola','sale',NULL,0,NULL,'2026-05-30 14:55:54'),(6,NULL,'new_delivery','New delivery scheduled','Delivery #8 for PM Test Cola','delivery','8',0,NULL,'2026-05-30 14:55:55'),(7,NULL,'customer_added','New customer','Customer Sri Sai Provisions added','customer','9',0,NULL,'2026-05-30 15:18:13'),(8,NULL,'customer_added','New customer','Customer SAI AGENCIES added','customer','10',0,NULL,'2026-05-30 15:34:06'),(9,2,'delivery_completed','Delivery completed','Delivery #6 marked completed','delivery','6',0,NULL,'2026-05-31 05:58:28'),(10,NULL,'low_stock','Low stock alert','Kinley is at 5.00 cases (threshold 10.00)','inventory','9',0,NULL,'2026-05-31 07:13:21'),(11,NULL,'low_stock','Low stock alert','Fanta is at 10.00 cases (threshold 10.00)','inventory','10',0,NULL,'2026-05-31 07:14:17');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_attempts`
--

DROP TABLE IF EXISTS `payment_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_order_id` bigint unsigned NOT NULL,
  `attempt_no` int unsigned NOT NULL DEFAULT '1',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_attempts_order` (`payment_order_id`),
  CONSTRAINT `fk_payment_attempts_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_attempts`
--

LOCK TABLES `payment_attempts` WRITE;
/*!40000 ALTER TABLE `payment_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_audit_logs`
--

DROP TABLE IF EXISTS `payment_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `action` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` int DEFAULT NULL,
  `old_status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_payment_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_audit_logs`
--

LOCK TABLES `payment_audit_logs` WRITE;
/*!40000 ALTER TABLE `payment_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_orders`
--

DROP TABLE IF EXISTS `payment_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotency_key` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `distributor_id` int DEFAULT NULL,
  `razorpay_order_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount_paise` int unsigned NOT NULL,
  `amount_inr` decimal(12,2) NOT NULL,
  `gst_paise` int unsigned NOT NULL DEFAULT '0',
  `fee_paise` int unsigned NOT NULL DEFAULT '0',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `status` enum('CREATED','INITIATED','PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED','REFUNDED','BLOCKED','FLAGGED_FOR_REVIEW') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CREATED',
  `payment_method` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upi',
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_ref` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `risk_score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `verification_flags` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geo_country` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geo_region` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_orders_uuid` (`order_uuid`),
  UNIQUE KEY `uk_payment_orders_idempotency` (`idempotency_key`),
  UNIQUE KEY `uk_payment_orders_razorpay_order` (`razorpay_order_id`),
  KEY `idx_payment_orders_user` (`user_id`),
  KEY `idx_payment_orders_customer` (`customer_id`),
  KEY `idx_payment_orders_status` (`status`),
  KEY `idx_payment_orders_created` (`created_at`),
  KEY `fk_payment_orders_distributor` (`distributor_id`),
  KEY `idx_payment_orders_user_status_created` (`user_id`,`status`,`created_at`),
  KEY `idx_payment_orders_risk_status` (`risk_score`,`status`),
  CONSTRAINT `fk_payment_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payment_orders_distributor` FOREIGN KEY (`distributor_id`) REFERENCES `distributors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payment_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_orders`
--

LOCK TABLES `payment_orders` WRITE;
/*!40000 ALTER TABLE `payment_orders` DISABLE KEYS */;
INSERT INTO `payment_orders` VALUES (1,'ee0ace6c-386f-492c-bdda-e4cea3b015ec','tu_1780127431752_qtzy5c5',2,7,NULL,NULL,200000,2000.00,0,0,'INR','CREATED','upi','Payment — KIRAN STORES','TU-1780127432664',0.00,NULL,NULL,'fp_9zl5ek','152.57.231.131',NULL,NULL,'2026-05-30 07:50:32','2026-05-30 07:50:32',NULL),(2,'09960ea9-428b-46cf-8ce4-cb652bdd7703','tu_1780155703470_yiqb62b',2,7,NULL,NULL,69700,697.00,0,0,'INR','CREATED','upi','Payment — Sri Sai Super Provisions','TU-1780155704580',0.00,NULL,NULL,'fp_9zl5ek','27.6.44.201',NULL,NULL,'2026-05-30 15:41:44','2026-05-30 15:41:44',NULL);
/*!40000 ALTER TABLE `payment_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_reconciliations`
--

DROP TABLE IF EXISTS `payment_reconciliations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_reconciliations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `collection_id` bigint unsigned DEFAULT NULL,
  `sale_id` int DEFAULT NULL,
  `customer_id` int NOT NULL,
  `matched_amount` decimal(12,2) NOT NULL,
  `status` enum('pending','matched','partial','void') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `notes` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recon_customer` (`customer_id`),
  KEY `fk_recon_collection` (`collection_id`),
  CONSTRAINT `fk_recon_collection` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_reconciliations`
--

LOCK TABLES `payment_reconciliations` WRITE;
/*!40000 ALTER TABLE `payment_reconciliations` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_reconciliations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_refunds`
--

DROP TABLE IF EXISTS `payment_refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_refunds` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_transaction_id` bigint unsigned NOT NULL,
  `razorpay_refund_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount_paise` int unsigned NOT NULL,
  `status` enum('CREATED','PENDING','PROCESSED','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CREATED',
  `reason` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initiated_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_refunds_razorpay` (`razorpay_refund_id`),
  KEY `idx_payment_refunds_tx` (`payment_transaction_id`),
  KEY `fk_payment_refunds_user` (`initiated_by`),
  CONSTRAINT `fk_payment_refunds_tx` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`id`),
  CONSTRAINT `fk_payment_refunds_user` FOREIGN KEY (`initiated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_refunds`
--

LOCK TABLES `payment_refunds` WRITE;
/*!40000 ALTER TABLE `payment_refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_order_id` bigint unsigned NOT NULL,
  `razorpay_payment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `upi_transaction_ref` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payer_vpa` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `masked_metadata` json DEFAULT NULL,
  `status` enum('CREATED','INITIATED','PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED','REFUNDED','BLOCKED','FLAGGED_FOR_REVIEW') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `amount_paise` int unsigned NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `failure_reason` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timeline` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_tx_razorpay_payment` (`razorpay_payment_id`),
  KEY `idx_payment_tx_order` (`payment_order_id`),
  KEY `idx_payment_tx_status` (`status`),
  KEY `idx_payment_tx_order_status` (`payment_order_id`,`status`),
  CONSTRAINT `fk_payment_tx_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_webhooks`
--

DROP TABLE IF EXISTS `payment_webhooks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_webhooks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `razorpay_order_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razorpay_payment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_valid` tinyint(1) NOT NULL DEFAULT '0',
  `replay_detected` tinyint(1) NOT NULL DEFAULT '0',
  `webhook_timestamp` bigint DEFAULT NULL,
  `nonce` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` json NOT NULL,
  `processed` tinyint(1) NOT NULL DEFAULT '0',
  `processed_at` datetime DEFAULT NULL,
  `error_message` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_webhooks_payload_hash` (`payload_hash`),
  UNIQUE KEY `uk_payment_webhooks_event` (`event_id`),
  KEY `idx_payment_webhooks_type` (`event_type`),
  KEY `idx_payment_webhooks_processed` (`processed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_webhooks`
--

LOCK TABLES `payment_webhooks` WRITE;
/*!40000 ALTER TABLE `payment_webhooks` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_webhooks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permissions_slug` (`slug`),
  KEY `idx_permissions_module` (`module`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'dashboard.view','dashboard','view','View executive dashboard'),(2,'inventory.view','inventory','view','View inventory'),(3,'inventory.create','inventory','create','Add products'),(4,'inventory.update','inventory','update','Update stock and products'),(5,'inventory.delete','inventory','delete','Delete products'),(6,'customers.view','customers','view','View customers'),(7,'customers.create','customers','create','Create customers'),(8,'customers.update','customers','update','Update customers'),(9,'customers.delete','customers','delete','Delete customers'),(10,'sales.view','sales','view','View sales'),(11,'sales.create','sales','create','Record sales'),(12,'sales.delete','sales','delete','Delete sales'),(13,'deliveries.view','deliveries','view','View deliveries'),(14,'deliveries.view_own','deliveries','view_own','View assigned deliveries only'),(15,'deliveries.create','deliveries','create','Schedule deliveries'),(16,'deliveries.update','deliveries','update','Update delivery status'),(17,'deliveries.delete','deliveries','delete','Delete deliveries'),(18,'reports.view','reports','view','View reports'),(19,'reports.export','reports','export','Export PDF/CSV'),(20,'audit.view','audit','view','View audit trail'),(21,'notifications.view','notifications','view','View notifications'),(22,'users.manage','users','manage','Manage users and roles'),(23,'payments.view','payments','view','View UPI payments'),(24,'portal.view','portal','view','Customer portal access'),(26,'security.view','security','view','View own security settings and sessions'),(27,'security.manage','security','manage','Manage MFA, devices, and revoke own sessions'),(28,'security.admin','security','admin','Admin security policies and audit'),(29,'collections.view','collections','view','View dues and collections'),(30,'collections.manage','collections','manage','Record collections and reconciliation'),(31,'suppliers.view','suppliers','view','View suppliers and purchase orders'),(32,'suppliers.manage','suppliers','manage','Manage suppliers, POs, and stock inward');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `po_number` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','ordered','partial','received','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `expected_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_number` (`po_number`),
  KEY `idx_po_supplier` (`supplier_id`),
  CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rate_limit_cooldowns`
--

DROP TABLE IF EXISTS `rate_limit_cooldowns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_limit_cooldowns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `limiter_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g. auth_login:ip:203.0.113.1',
  `blocked_until` datetime(3) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rate_limit_cooldown` (`limiter_name`,`scope_key`),
  KEY `idx_rate_limit_cooldown_until` (`blocked_until`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rate_limit_cooldowns`
--

LOCK TABLES `rate_limit_cooldowns` WRITE;
/*!40000 ALTER TABLE `rate_limit_cooldowns` DISABLE KEYS */;
/*!40000 ALTER TABLE `rate_limit_cooldowns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rate_limit_settings`
--

DROP TABLE IF EXISTS `rate_limit_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rate_limit_settings` (
  `limiter_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `window_ms` int unsigned NOT NULL DEFAULT '900000',
  `max_ip` int unsigned NOT NULL DEFAULT '10',
  `max_user` int unsigned NOT NULL DEFAULT '5',
  `max_device` int unsigned NOT NULL DEFAULT '40',
  `burst_max` int unsigned NOT NULL DEFAULT '3',
  `burst_window_ms` int unsigned NOT NULL DEFAULT '10000',
  `cooldown_ms` int unsigned NOT NULL DEFAULT '300000' COMMENT '0 = no cooldown lockout',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`limiter_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rate_limit_settings`
--

LOCK TABLES `rate_limit_settings` WRITE;
/*!40000 ALTER TABLE `rate_limit_settings` DISABLE KEYS */;
INSERT INTO `rate_limit_settings` VALUES ('admin',60000,60,30,40,10,10000,0,1,'2026-05-29 20:10:31'),('auth_login',900000,10,20,40,5,10000,3000,1,'2026-05-31 15:46:47'),('pay_create',60000,20,10,40,5,10000,0,1,'2026-05-29 20:10:31'),('pay_verify',60000,40,20,40,8,10000,0,1,'2026-05-29 20:10:31'),('pay_webhook',60000,200,1000,1000,50,10000,0,1,'2026-05-29 20:10:31'),('risk_analyze',60000,30,15,40,6,10000,0,1,'2026-05-29 20:10:31');
/*!40000 ALTER TABLE `rate_limit_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `idx_role_permissions_perm` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(2,1),(3,1),(4,1),(5,1),(1,2),(2,2),(3,2),(1,3),(2,3),(1,4),(2,4),(1,5),(2,5),(1,6),(2,6),(3,6),(1,7),(2,7),(3,7),(1,8),(2,8),(3,8),(1,9),(2,9),(1,10),(2,10),(3,10),(1,11),(2,11),(3,11),(1,12),(2,12),(1,13),(2,13),(1,14),(4,14),(5,14),(1,15),(2,15),(1,16),(2,16),(4,16),(5,16),(1,17),(2,17),(1,18),(2,18),(1,19),(2,19),(1,20),(1,21),(2,21),(3,21),(4,21),(5,21),(1,22),(1,23),(3,23),(6,24),(1,26),(2,26),(3,26),(5,26),(1,27),(2,27),(3,27),(5,27),(1,28),(1,29),(2,29),(1,30),(2,30),(1,31),(2,31),(1,32),(2,32);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMIN','Administrator','Full system access',1,'2026-05-29 19:57:03'),(2,'MANAGER','Manager','Operations and reports',1,'2026-05-29 19:57:03'),(3,'SALESPERSON','Salesperson','Customers and sales',1,'2026-05-29 19:57:03'),(4,'DELIVERY_AGENT','Delivery Agent','Assigned deliveries only',1,'2026-05-29 19:57:03'),(5,'DELIVERY','Delivery','Delivery operations',1,'2026-05-29 20:33:24'),(6,'CUSTOMER','Customer','Customer portal access',1,'2026-05-29 20:33:24');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `price_per_case` decimal(12,2) DEFAULT '0.00',
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `amount_paid` decimal(12,2) DEFAULT '0.00',
  `payment_mode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_customer_id` (`customer_id`),
  KEY `idx_sales_created_at` (`created_at`),
  KEY `idx_sales_product_name` (`product_name`),
  KEY `idx_sales_created_amount` (`created_at`,`total_amount`),
  CONSTRAINT `fk_sales_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES (1,1,'THUMBS UP (300)',24,899.00,21576.00,0.00,'UPI','','2026-05-28 12:47:00'),(2,2,'QA Beer 1779972775343',5,1200.00,6000.00,6000.00,'Cash','E2E QA sale','2026-05-28 12:53:01'),(3,3,'QA Beer 1779972856224',5,1200.00,6000.00,6000.00,'Cash','E2E QA sale','2026-05-28 12:54:22'),(4,4,'QA Beer 1779973140281',5,1200.00,6000.00,6000.00,'Cash','E2E QA sale','2026-05-28 12:59:11'),(5,5,'QA Beer 1779973251995',5,1200.00,6000.00,6000.00,'Cash','E2E QA sale','2026-05-28 13:01:01'),(6,7,'THUMBS UP (300)',20,100.00,2000.00,0.00,'UPI','','2026-05-29 04:36:09'),(7,7,'THUMBS UP (300)',3,899.00,2697.00,0.00,'Cash','','2026-05-30 07:48:47');
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `security_audit_events`
--

DROP TABLE IF EXISTS `security_audit_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_audit_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sec_audit_type_created` (`event_type`,`created_at`),
  KEY `idx_sec_audit_user` (`user_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_audit_events`
--

LOCK TABLES `security_audit_events` WRITE;
/*!40000 ALTER TABLE `security_audit_events` DISABLE KEYS */;
INSERT INTO `security_audit_events` VALUES (1,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"OS\", \"browser\": \"Browser\", \"fingerprint\": \"hotfix-verify-1780241311614\"}','27.6.44.201','hotfix-verify-1780241311614','node','2026-05-31 15:28:35'),(2,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"OS\", \"browser\": \"Browser\", \"fingerprint\": \"hotfix-verify-1780241311614\"}','27.6.44.201','hotfix-verify-1780241311614','node','2026-05-31 15:28:37'),(3,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"Windows\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_708d8223\"}','27.6.44.201','fp_708d8223','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 15:32:00'),(4,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','27.6.44.201','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 15:34:21'),(5,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','27.6.44.201','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-05-31 15:47:17'),(6,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"Windows\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_708d8223\"}','27.6.44.201','fp_708d8223','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36','2026-05-31 15:54:44'),(7,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','152.59.203.220','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-06-01 04:16:21'),(8,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-06-02 12:00:08'),(9,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-06-02 12:04:45'),(10,'device_new_detected',2,NULL,NULL,NULL,'{\"os\": \"Android\", \"browser\": \"Chrome\", \"fingerprint\": \"fp_4fd9030e\"}','152.59.204.2','fp_4fd9030e','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','2026-06-02 12:09:08');
/*!40000 ALTER TABLE `security_audit_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `security_incidents`
--

DROP TABLE IF EXISTS `security_incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_incidents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `incident_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `user_id` int DEFAULT NULL,
  `payment_order_id` bigint unsigned DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolved` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_security_incidents_type` (`incident_type`),
  KEY `idx_security_incidents_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_incidents`
--

LOCK TABLES `security_incidents` WRITE;
/*!40000 ALTER TABLE `security_incidents` DISABLE KEYS */;
/*!40000 ALTER TABLE `security_incidents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_alerts`
--

DROP TABLE IF EXISTS `stock_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_alerts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `inventory_id` int NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_stock` decimal(12,2) NOT NULL,
  `threshold` decimal(12,2) NOT NULL,
  `status` enum('active','resolved','dismissed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `alert_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stock_alerts_inventory` (`inventory_id`),
  KEY `idx_stock_alerts_status` (`status`),
  KEY `idx_stock_alerts_date` (`alert_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_alerts`
--

LOCK TABLES `stock_alerts` WRITE;
/*!40000 ALTER TABLE `stock_alerts` DISABLE KEYS */;
INSERT INTO `stock_alerts` VALUES (1,1,'THUMBS UP',5.00,10.00,'active','2026-05-29 21:44:29',NULL),(2,6,'Thumbs Up',5.00,10.00,'active','2026-05-29 21:44:30',NULL),(3,9,'Kinley',5.00,10.00,'active','2026-05-31 07:13:21',NULL),(4,10,'Fanta',10.00,10.00,'active','2026-05-31 07:14:17',NULL);
/*!40000 ALTER TABLE `stock_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_inward`
--

DROP TABLE IF EXISTS `stock_inward`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_inward` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_id` bigint unsigned DEFAULT NULL,
  `supplier_id` int NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `received_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inward_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_inward`
--

LOCK TABLES `stock_inward` WRITE;
/*!40000 ALTER TABLE `stock_inward` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_inward` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_ledger`
--

DROP TABLE IF EXISTS `supplier_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `entry_type` enum('debit','credit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `reference_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_ledger` (`supplier_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_ledger`
--

LOCK TABLES `supplier_ledger` WRITE;
/*!40000 ALTER TABLE `supplier_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_payments`
--

DROP TABLE IF EXISTS `supplier_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_no` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_payments` (`supplier_id`,`paid_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_payments`
--

LOCK TABLES `supplier_payments` WRITE;
/*!40000 ALTER TABLE `supplier_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gstin` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_suppliers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suspicious_activities`
--

DROP TABLE IF EXISTS `suspicious_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suspicious_activities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `payment_order_id` bigint unsigned DEFAULT NULL,
  `activity_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `risk_score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` json DEFAULT NULL,
  `reviewed` tinyint(1) NOT NULL DEFAULT '0',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_suspicious_user` (`user_id`),
  KEY `idx_suspicious_reviewed` (`reviewed`),
  KEY `idx_suspicious_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suspicious_activities`
--

LOCK TABLES `suspicious_activities` WRITE;
/*!40000 ALTER TABLE `suspicious_activities` DISABLE KEYS */;
INSERT INTO `suspicious_activities` VALUES (1,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-29 19:57:58'),(2,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-29 19:58:12'),(3,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-29 20:00:25'),(4,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-29 20:01:12'),(5,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-29 20:02:29'),(6,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-29 20:02:41'),(7,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-30 17:29:27'),(8,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-30 17:39:17'),(9,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-30 17:41:01'),(10,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-30 17:41:33'),(11,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 03:50:27'),(12,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 03:50:38'),(13,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 03:52:20'),(14,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 14:27:16'),(15,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 14:27:36'),(16,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 14:31:17'),(17,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 15:38:57'),(18,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 15:41:17'),(19,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 15:43:21'),(20,NULL,NULL,'rate_limit_abuse','medium',30.00,NULL,NULL,'{\"endpoint\": \"auth_login\"}',0,NULL,NULL,'2026-05-31 15:44:25');
/*!40000 ALTER TABLE `suspicious_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trusted_devices`
--

DROP TABLE IF EXISTS `trusted_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trusted_devices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_label` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `verified_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `timezone` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `label` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trusted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trusted_device` (`user_id`,`device_fingerprint`),
  CONSTRAINT `fk_trusted_devices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trusted_devices`
--

LOCK TABLES `trusted_devices` WRITE;
/*!40000 ALTER TABLE `trusted_devices` DISABLE KEYS */;
INSERT INTO `trusted_devices` VALUES (1,2,'hotfix-verify-1780241311614',NULL,'Browser',NULL,'OS',NULL,0,NULL,NULL,NULL,'Device · Browser','27.6.44.201','2026-05-31 15:28:35',NULL,1,'2026-05-31 15:28:35','2026-05-31 15:28:37',NULL),(3,2,'fp_708d8223',NULL,'Chrome',NULL,'Windows',NULL,0,NULL,NULL,NULL,'Win32 · Chrome','27.6.44.201','2026-05-31 15:32:00',NULL,1,'2026-05-31 15:32:00','2026-05-31 15:54:44',NULL),(4,2,'fp_4fd9030e',NULL,'Chrome',NULL,'Android',NULL,0,NULL,NULL,NULL,'Linux armv81 · Chrome','152.59.204.2','2026-05-31 15:34:21',NULL,1,'2026-05-31 15:34:21','2026-06-02 12:09:08',NULL);
/*!40000 ALTER TABLE `trusted_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_mfa_backup_codes`
--

DROP TABLE IF EXISTS `user_mfa_backup_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_mfa_backup_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `code_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mfa_backup_user` (`user_id`),
  CONSTRAINT `fk_mfa_backup_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_mfa_backup_codes`
--

LOCK TABLES `user_mfa_backup_codes` WRITE;
/*!40000 ALTER TABLE `user_mfa_backup_codes` DISABLE KEYS */;
INSERT INTO `user_mfa_backup_codes` VALUES (1,2,'ABCDEFGHI',NULL,'2026-06-02 12:04:22');
/*!40000 ALTER TABLE `user_mfa_backup_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_mfa_email_otp`
--

DROP TABLE IF EXISTS `user_mfa_email_otp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_mfa_email_otp` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `otp_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mfa_login',
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mfa_email_user_exp` (`user_id`,`expires_at`),
  CONSTRAINT `fk_mfa_email_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_mfa_email_otp`
--

LOCK TABLES `user_mfa_email_otp` WRITE;
/*!40000 ALTER TABLE `user_mfa_email_otp` DISABLE KEYS */;
INSERT INTO `user_mfa_email_otp` VALUES (1,2,'605e2a7ba1e7519775092be590c3f676a520f472681468a51862095fb9267ee8','device_verify','2026-05-31 15:38:36',NULL,'2026-05-31 15:28:35'),(2,2,'155ac19f043111188ecc001078a30193b315304f078a1daa2ec406a2d5ad96b9','device_verify','2026-05-31 15:38:38',NULL,'2026-05-31 15:28:37'),(3,2,'3d34f9f5b0b4868fbe304d5c00cf5092c69727d2098f68037d1999af4d0ec649','mfa_login','2026-05-31 15:38:38',NULL,'2026-05-31 15:28:37'),(4,2,'8bac5fc534a83ec7dc20ce21835b8285d037dcdcc2511711c5551bb1cc30554a','device_verify','2026-05-31 15:42:01',NULL,'2026-05-31 15:32:00'),(5,2,'5c83d505d8af520d1ac21182d0496e2fa2e99271ceea5f2caada00d987055db6','mfa_login','2026-05-31 15:42:01',NULL,'2026-05-31 15:32:00'),(6,2,'2ed2fd2cbe6d27dfae640d78c7f14533fb02c8968a0f3d208b74b0c3393085f2','mfa_login','2026-05-31 15:44:14',NULL,'2026-05-31 15:34:13'),(7,2,'d5a92401c4220fa1498b4ac01a16b02ce3379ba7e054d349967c4394dae9708a','device_verify','2026-05-31 15:44:21',NULL,'2026-05-31 15:34:21'),(8,2,'2779991ab96c062c3dd8c603ee48fd91a2053bfed182ffd131f24600cbac85a6','mfa_login','2026-05-31 15:44:22',NULL,'2026-05-31 15:34:21'),(9,2,'381ac62814b4185dcf854f040b7c828ccc52f4b0fd67ccaea87ab97532a7116b','device_verify','2026-05-31 15:57:17',NULL,'2026-05-31 15:47:17'),(10,2,'9e5dd8822507a6a91077dd920c17f7c061eb15e0b6a43bcd0a1fd2dfbce50f46','mfa_login','2026-05-31 15:57:17',NULL,'2026-05-31 15:47:17'),(11,2,'faa695db0a66078572bab1c6aa5e0610982b30efb6e76ca69e4560b0c6ad3f1a','device_verify','2026-05-31 16:04:44',NULL,'2026-05-31 15:54:44'),(12,2,'b5a8b820b2647d079f8b391d760a2458a45b864b4b46bf4aa3eaed769367acce','mfa_login','2026-05-31 16:04:44',NULL,'2026-05-31 15:54:44'),(13,2,'85bfdd825fab7f0da5cf1a1098131638229d354d2486b92b33adc73ae25088eb','device_verify','2026-06-01 04:26:22',NULL,'2026-06-01 04:16:22'),(14,2,'8d7901fd0b0142b5fc5856dd427c6d74d8a5fc972d239fdd70a59826f244cf59','mfa_login','2026-06-01 04:26:22',NULL,'2026-06-01 04:16:22'),(15,2,'b9db2578e1967c4b4478993c6ad7f5b49d79cdc54810a17c791c4df17f392cff','device_verify','2026-06-02 12:10:09',NULL,'2026-06-02 12:00:08'),(16,2,'a23f26d78305781350cf0a1eebc0e9a6296e2f3ea76055ce5af5a4da91fee12a','mfa_login','2026-06-02 12:10:09',NULL,'2026-06-02 12:00:08'),(17,2,'9737dddc283113361cd9df30487953d2c9ff2a472f5713a0e3ed819085d1e9a1','device_verify','2026-06-02 12:14:46',NULL,'2026-06-02 12:04:45'),(18,2,'ae9a02e18b016e2b2c5a80a43705e3c3c6b52cee043959396ad5c6a3ebcc37e0','mfa_login','2026-06-02 12:14:46',NULL,'2026-06-02 12:04:45'),(19,2,'80dd5e61077a1aa0b9f92d3b703f2c404bba7abac6ba0bfc2c5e85f53130e0e5','device_verify','2026-06-02 12:19:08',NULL,'2026-06-02 12:09:08'),(20,2,'94714e5c9daf6fa0e94707d10882317175071185857cdbaf7300c09fc55ec019','mfa_login','2026-06-02 12:19:09',NULL,'2026-06-02 12:09:08');
/*!40000 ALTER TABLE `user_mfa_email_otp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_mfa_settings`
--

DROP TABLE IF EXISTS `user_mfa_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_mfa_settings` (
  `user_id` int NOT NULL,
  `totp_secret_enc` text COLLATE utf8mb4_unicode_ci,
  `totp_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `email_otp_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `backup_codes_generated` tinyint(1) NOT NULL DEFAULT '0',
  `mfa_enforced` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_mfa_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_mfa_settings`
--

LOCK TABLES `user_mfa_settings` WRITE;
/*!40000 ALTER TABLE `user_mfa_settings` DISABLE KEYS */;
INSERT INTO `user_mfa_settings` VALUES (2,NULL,0,1,0,0,'2026-05-31 15:28:35','2026-06-02 12:09:08');
/*!40000 ALTER TABLE `user_mfa_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_risk_scores`
--

DROP TABLE IF EXISTS `user_risk_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_risk_scores` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `factors` json DEFAULT NULL,
  `last_calculated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_risk_user` (`user_id`),
  CONSTRAINT `fk_user_risk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_risk_scores`
--

LOCK TABLES `user_risk_scores` WRITE;
/*!40000 ALTER TABLE `user_risk_scores` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_risk_scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `session_token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_fingerprint` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_label` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_trusted` tinyint(1) NOT NULL DEFAULT '0',
  `geo_country` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `geo_region` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `revoked_at` datetime DEFAULT NULL,
  `revoke_reason` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sessions_token` (`session_token_hash`),
  KEY `idx_user_sessions_user` (`user_id`),
  KEY `idx_user_sessions_device` (`device_fingerprint`),
  CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `role` enum('admin','distributor','user') NOT NULL DEFAULT 'user',
  `role_id` int DEFAULT NULL,
  `status` enum('active','suspended','banned','pending') NOT NULL DEFAULT 'active',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `mfa_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `mfa_enforced` tinyint(1) NOT NULL DEFAULT '0',
  `password` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_role_status` (`role`,`status`),
  KEY `idx_users_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin',NULL,NULL,'user',NULL,'active',1,NULL,'2026-05-29 19:56:36','2026-05-29 19:56:37',0,0,'$2b$12$Cr7EWTzZtbdRyXLTJp3kQe2uWCtNIBPjzYOoHUeQayYJxrW1.5bVm'),(2,'admin_sai','sai.nakka@alacriti.com',NULL,'admin',1,'active',1,NULL,'2026-05-29 19:57:51','2026-05-31 15:38:33',0,0,'$2b$12$jUVkq75yrjdKeWMWVwNQlunQJM5i0V6VTDYPB4XLv7rRInO8kTT0W'),(3,'manager_sai',NULL,NULL,'distributor',2,'active',1,NULL,'2026-05-29 19:57:52','2026-05-29 20:33:32',0,0,'$2b$12$DWU480thiBS3RDXpJFj2KukoZBh6ffi2H1GmrFBRs1EXe2sHhGUii'),(4,'sales_sai',NULL,NULL,'user',3,'active',1,NULL,'2026-05-29 19:57:53','2026-05-29 20:33:34',0,0,'$2b$12$Fb/zBrYmNEk1aikEMqV/N.5pPIPNRwPY5Y8TJfoTNJNOzBMvt1swS'),(5,'delivery_sai',NULL,NULL,'user',5,'active',1,NULL,'2026-05-29 19:57:54','2026-05-29 20:33:35',0,0,'$2b$12$E0D7sXXXOBrMlwzJQoC8f.4TRn8HU//8d/qpj0Z9b0tkN2ff66tOy'),(6,'customer_sai','customer@gmail.com','','user',6,'active',1,NULL,'2026-05-29 20:33:37','2026-05-30 03:56:58',0,0,'$2b$12$kFJ4UcsFlXnI.Gu4pWXXcuXoq172jVkWrIWgGwA6/abFHxKrXfn9m');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouse_transfers`
--

DROP TABLE IF EXISTS `warehouse_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouse_transfers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `from_location` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_location` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `status` enum('pending','in_transit','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouse_transfers`
--

LOCK TABLES `warehouse_transfers` WRITE;
/*!40000 ALTER TABLE `warehouse_transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouse_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhook_replay_guard`
--

DROP TABLE IF EXISTS `webhook_replay_guard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook_replay_guard` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `signature_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `webhook_timestamp` bigint DEFAULT NULL,
  `nonce` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `replay_detected` tinyint(1) NOT NULL DEFAULT '0',
  `source_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_webhook_replay_event` (`event_id`),
  UNIQUE KEY `uk_webhook_replay_payload` (`payload_hash`),
  KEY `idx_webhook_replay_received` (`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhook_replay_guard`
--

LOCK TABLES `webhook_replay_guard` WRITE;
/*!40000 ALTER TABLE `webhook_replay_guard` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhook_replay_guard` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'railway'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-07 15:04:11
