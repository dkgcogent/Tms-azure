-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: transportation_management
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary view structure for view `active_ifsc_cache`
--

DROP TABLE IF EXISTS `active_ifsc_cache`;
/*!50001 DROP VIEW IF EXISTS `active_ifsc_cache`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `active_ifsc_cache` AS SELECT 
 1 AS `ifsc_code`,
 1 AS `bank_name`,
 1 AS `branch_name`,
 1 AS `branch_address`,
 1 AS `city`,
 1 AS `state`,
 1 AS `district`,
 1 AS `contact_number`,
 1 AS `micr_code`,
 1 AS `swift_code`,
 1 AS `cached_at`,
 1 AS `data_source`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `adhoc_transactions`
--

DROP TABLE IF EXISTS `adhoc_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adhoc_transactions` (
  `TransactionID` int NOT NULL AUTO_INCREMENT,
  `TripType` varchar(20) NOT NULL,
  `TransactionDate` date NOT NULL,
  `TripNo` varchar(50) NOT NULL,
  `CustomerID` int DEFAULT NULL,
  `ProjectID` int DEFAULT NULL,
  `VehicleNumber` varchar(20) DEFAULT NULL,
  `VehicleNumbers` json DEFAULT NULL,
  `VehicleType` varchar(50) DEFAULT NULL,
  `VehicleTypes` json DEFAULT NULL,
  `VendorName` varchar(100) DEFAULT NULL,
  `VendorNames` json DEFAULT NULL,
  `VendorNumber` varchar(10) DEFAULT NULL,
  `VendorNumbers` json DEFAULT NULL,
  `DriverName` varchar(100) DEFAULT NULL,
  `DriverNames` json DEFAULT NULL,
  `DriverNumber` varchar(10) DEFAULT NULL,
  `DriverNumbers` json DEFAULT NULL,
  `DriverAadharNumber` varchar(12) DEFAULT NULL,
  `DriverLicenceNumber` varchar(20) DEFAULT NULL,
  `DriverAadharDoc` varchar(255) DEFAULT NULL,
  `DriverLicenceDoc` varchar(255) DEFAULT NULL,
  `TollExpensesDoc` varchar(255) DEFAULT NULL,
  `ParkingChargesDoc` varchar(255) DEFAULT NULL,
  `OpeningKMImage` varchar(255) DEFAULT NULL,
  `ClosingKMImage` varchar(255) DEFAULT NULL,
  `ArrivalTimeAtHub` time DEFAULT NULL,
  `InTimeByCust` time DEFAULT NULL,
  `OutTimeFromHub` time DEFAULT NULL,
  `ReturnReportingTime` time DEFAULT NULL,
  `OutTimeFrom` time DEFAULT NULL,
  `OpeningKM` decimal(10,2) NOT NULL,
  `ClosingKM` decimal(10,2) NOT NULL,
  `TotalShipmentsForDeliveries` int DEFAULT NULL,
  `TotalShipmentDeliveriesAttempted` int DEFAULT NULL,
  `TotalShipmentDeliveriesDone` int DEFAULT NULL,
  `VFreightFix` decimal(10,2) DEFAULT NULL,
  `FixKm` decimal(10,2) DEFAULT NULL,
  `VFreightVariable` decimal(10,2) DEFAULT NULL,
  `TotalFreight` decimal(10,2) DEFAULT NULL,
  `TollExpenses` decimal(10,2) DEFAULT NULL,
  `ParkingCharges` decimal(10,2) DEFAULT NULL,
  `LoadingCharges` decimal(10,2) DEFAULT NULL,
  `UnloadingCharges` decimal(10,2) DEFAULT NULL,
  `OtherCharges` decimal(10,2) DEFAULT NULL,
  `OtherChargesRemarks` text,
  `TotalDutyHours` decimal(5,2) DEFAULT NULL,
  `AdvanceRequestNo` varchar(50) DEFAULT NULL,
  `AdvanceToPaid` decimal(10,2) DEFAULT NULL,
  `AdvanceApprovedAmount` decimal(10,2) DEFAULT NULL,
  `AdvanceApprovedBy` varchar(100) DEFAULT NULL,
  `AdvancePaidAmount` decimal(10,2) DEFAULT NULL,
  `AdvancePaidMode` varchar(20) DEFAULT NULL,
  `AdvancePaidDate` date DEFAULT NULL,
  `AdvancePaidBy` varchar(100) DEFAULT NULL,
  `EmployeeDetailsAdvance` text,
  `BalanceToBePaid` decimal(10,2) DEFAULT NULL,
  `BalancePaidAmount` decimal(10,2) DEFAULT NULL,
  `Variance` decimal(10,2) DEFAULT NULL,
  `BalancePaidDate` date DEFAULT NULL,
  `BalancePaidBy` varchar(100) DEFAULT NULL,
  `EmployeeDetailsBalance` text,
  `Revenue` decimal(10,2) DEFAULT NULL,
  `Margin` decimal(10,2) DEFAULT NULL,
  `MarginPercentage` decimal(5,2) DEFAULT NULL,
  `Status` varchar(20) DEFAULT 'Pending',
  `TripClose` tinyint(1) DEFAULT '0',
  `Remarks` text,
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `VehicleReportingAtHub` time DEFAULT NULL COMMENT 'Time 1: Vehicle Reporting at Hub/WH (Start of duty)',
  `VehicleEntryInHub` time DEFAULT NULL COMMENT 'Time 2: Vehicle Entry in Hub/WH',
  `VehicleOutFromHubForDelivery` time DEFAULT NULL COMMENT 'Time 3: Vehicle Out from Hub/WH for Delivery',
  `VehicleReturnAtHub` time DEFAULT NULL COMMENT 'Time 4: Vehicle Return at Hub/WH',
  `VehicleEnteredAtHubReturn` time DEFAULT NULL COMMENT 'Time 5: Vehicle Entered at Hub/WH (Return)',
  `VehicleOutFromHubFinal` time DEFAULT NULL COMMENT 'Time 6: Vehicle Out from Hub Final (Trip Close - End of duty)',
  PRIMARY KEY (`TransactionID`),
  UNIQUE KEY `unique_trip_no` (`TripNo`,`TransactionDate`),
  KEY `idx_transaction_date` (`TransactionDate`),
  KEY `idx_trip_no` (`TripNo`),
  KEY `idx_trip_type` (`TripType`),
  KEY `idx_vehicle_number` (`VehicleNumber`),
  KEY `idx_vendor_name` (`VendorName`),
  KEY `idx_driver_name` (`DriverName`),
  KEY `idx_driver_number` (`DriverNumber`),
  KEY `idx_status` (`Status`),
  KEY `idx_customer_ref` (`CustomerID`),
  KEY `idx_project_ref` (`ProjectID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `amendment_po_header`
--

DROP TABLE IF EXISTS `amendment_po_header`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amendment_po_header` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `pokey` varchar(20) NOT NULL,
  `po_no` varchar(50) DEFAULT NULL,
  `l5no_po` varchar(50) DEFAULT NULL,
  `po_date` datetime DEFAULT NULL,
  `recv_date` datetime DEFAULT NULL,
  `purchaser_code` varchar(50) DEFAULT NULL,
  `purchaser_detail` varchar(255) DEFAULT NULL,
  `vendor_code` varchar(50) DEFAULT NULL,
  `vendor_details` text,
  `firm_details` varchar(255) DEFAULT NULL,
  `rly_code` varchar(10) DEFAULT NULL,
  `rly_shortname` varchar(20) DEFAULT NULL,
  `stock_nonstock` char(1) DEFAULT NULL,
  `rly_nonrly` char(1) DEFAULT NULL,
  `po_or_letter` char(1) DEFAULT NULL,
  `inspecting_agency` varchar(50) DEFAULT NULL,
  `po_status` varchar(10) DEFAULT NULL,
  `item_cat` varchar(10) DEFAULT NULL,
  `item_cat_descr` varchar(100) DEFAULT NULL,
  `po_pdf_path` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `amendment_po_item`
--

DROP TABLE IF EXISTS `amendment_po_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amendment_po_item` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `header_id` bigint NOT NULL,
  `rly` varchar(10) DEFAULT NULL,
  `pl_no` varchar(50) DEFAULT NULL,
  `item_srno` varchar(10) DEFAULT NULL,
  `item_desc` text,
  `consignee_cd` varchar(50) DEFAULT NULL,
  `imms_consignee_cd` varchar(50) DEFAULT NULL,
  `imms_consignee_name` varchar(100) DEFAULT NULL,
  `consignee_detail` varchar(255) DEFAULT NULL,
  `qty` decimal(10,2) DEFAULT NULL,
  `qty_cancelled` decimal(10,2) DEFAULT NULL,
  `rate` decimal(12,2) DEFAULT NULL,
  `uom_cd` varchar(10) DEFAULT NULL,
  `uom` varchar(20) DEFAULT NULL,
  `basic_value` decimal(14,2) DEFAULT NULL,
  `sales_tax_per` decimal(6,2) DEFAULT NULL,
  `sales_tax` decimal(14,2) DEFAULT NULL,
  `discount_type` varchar(5) DEFAULT NULL,
  `discount_per` decimal(6,2) DEFAULT NULL,
  `discount` decimal(14,2) DEFAULT NULL,
  `other_charges` decimal(14,2) DEFAULT NULL,
  `value` decimal(14,2) DEFAULT NULL,
  `delivery_date` datetime DEFAULT NULL,
  `ext_delivery_date` datetime DEFAULT NULL,
  `allocation` varchar(50) DEFAULT NULL,
  `bill_pay_off` varchar(50) DEFAULT NULL,
  `bill_pay_off_desc` varchar(100) DEFAULT NULL,
  `bill_pass_off` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_amendment_po_item_header` (`header_id`),
  CONSTRAINT `fk_amendment_po_item_header` FOREIGN KEY (`header_id`) REFERENCES `amendment_po_header` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `billing`
--

DROP TABLE IF EXISTS `billing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing` (
  `BillingID` int NOT NULL AUTO_INCREMENT,
  `InvoiceNo` varchar(100) NOT NULL,
  `InvoiceDate` date NOT NULL,
  `BillingPeriodStart` date NOT NULL,
  `BillingPeriodEnd` date NOT NULL,
  `CustomerID` int NOT NULL,
  `ProjectID` int DEFAULT NULL,
  `TotalTransactions` int DEFAULT '0',
  `TotalAmount` decimal(15,2) DEFAULT '0.00',
  `GSTRate` decimal(5,2) DEFAULT '18.00',
  `GSTAmount` decimal(15,2) DEFAULT '0.00',
  `GrandTotal` decimal(15,2) DEFAULT '0.00',
  `PaymentStatus` enum('Pending','Paid','Partial','Overdue') DEFAULT 'Pending',
  `DueDate` date DEFAULT NULL,
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`BillingID`),
  UNIQUE KEY `InvoiceNo` (`InvoiceNo`),
  KEY `CustomerID` (`CustomerID`),
  KEY `ProjectID` (`ProjectID`),
  KEY `idx_invoice_date` (`InvoiceDate`),
  KEY `idx_payment_status` (`PaymentStatus`),
  CONSTRAINT `billing_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`) ON DELETE CASCADE,
  CONSTRAINT `billing_ibfk_2` FOREIGN KEY (`ProjectID`) REFERENCES `project` (`ProjectID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cluster_cm_user`
--

DROP TABLE IF EXISTS `cluster_cm_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cluster_cm_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cluster_name` varchar(255) DEFAULT NULL,
  `cm_user_id` int DEFAULT NULL,
  `created_date` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cluster_primary_ie`
--

DROP TABLE IF EXISTS `cluster_primary_ie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cluster_primary_ie` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cluster_name` varchar(255) DEFAULT NULL,
  `created_date` datetime(6) DEFAULT NULL,
  `ie_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cluster_rio_user`
--

DROP TABLE IF EXISTS `cluster_rio_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cluster_rio_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cluster_name` varchar(255) DEFAULT NULL,
  `created_date` datetime(6) DEFAULT NULL,
  `rio_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cluster_secondary_ie`
--

DROP TABLE IF EXISTS `cluster_secondary_ie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cluster_secondary_ie` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cluster_name` varchar(255) DEFAULT NULL,
  `created_date` datetime(6) DEFAULT NULL,
  `ie_user_id` int DEFAULT NULL,
  `priority_order` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cris_sync_status`
--

DROP TABLE IF EXISTS `cris_sync_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cris_sync_status` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ref_type` varchar(20) NOT NULL,
  `ref_key` varchar(50) NOT NULL,
  `rly` varchar(10) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `error_message` varchar(2000) DEFAULT NULL,
  `fetched_at` datetime DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cris_sync` (`ref_type`,`ref_key`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `CustomerID` int NOT NULL AUTO_INCREMENT,
  `MasterCustomerName` varchar(255) NOT NULL DEFAULT 'Default Master',
  `Name` varchar(255) NOT NULL,
  `CustomerCode` varchar(100) NOT NULL,
  `CustomerMobileNo` varchar(15) DEFAULT NULL,
  `CustomerEmail` varchar(255) DEFAULT NULL,
  `CustomerContactPerson` varchar(255) DEFAULT NULL,
  `AlternateMobileNo` varchar(15) DEFAULT NULL,
  `CustomerGroup` varchar(100) DEFAULT NULL,
  `ServiceCode` varchar(100) DEFAULT NULL,
  `TypeOfServices` enum('Transportation','Warehousing','Both','Logistics','Industrial Transport','Retail Distribution','Other') DEFAULT 'Transportation',
  `CityName` varchar(255) DEFAULT NULL,
  `HouseFlatNo` varchar(100) DEFAULT NULL,
  `StreetLocality` varchar(255) DEFAULT NULL,
  `CustomerCity` varchar(100) DEFAULT NULL,
  `CustomerState` varchar(100) DEFAULT NULL,
  `CustomerPinCode` varchar(6) DEFAULT NULL,
  `CustomerCountry` varchar(100) DEFAULT 'India',
  `TypeOfBilling` enum('GST','Non-GST','RCM') DEFAULT 'RCM',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `Locations` text,
  `CustomerSite` varchar(255) DEFAULT NULL,
  `Agreement` enum('Yes','No') DEFAULT 'No',
  `AgreementFile` varchar(500) DEFAULT NULL,
  `AgreementDate` date DEFAULT NULL,
  `AgreementTenure` int DEFAULT NULL,
  `AgreementExpiryDate` date DEFAULT NULL,
  `CustomerNoticePeriod` int DEFAULT NULL,
  `CogentNoticePeriod` int DEFAULT NULL,
  `CreditPeriod` int DEFAULT NULL,
  `Insurance` enum('Yes','No') DEFAULT 'No',
  `MinimumInsuranceValue` decimal(15,2) DEFAULT NULL,
  `CogentDebitClause` enum('Yes','No') DEFAULT 'No',
  `CogentDebitLimit` decimal(15,2) DEFAULT NULL,
  `BG` enum('Yes','No') DEFAULT 'No',
  `BGFile` varchar(500) DEFAULT NULL,
  `BGAmount` decimal(15,2) DEFAULT NULL,
  `BGDate` date DEFAULT NULL,
  `BGExpiryDate` date DEFAULT NULL,
  `BGBank` varchar(255) DEFAULT NULL,
  `BGReceivingByCustomer` text,
  `BGReceivingFile` varchar(500) DEFAULT NULL,
  `PO` text,
  `POFile` varchar(500) DEFAULT NULL,
  `PODate` date DEFAULT NULL,
  `POValue` decimal(15,2) DEFAULT NULL,
  `POTenure` int DEFAULT NULL,
  `POExpiryDate` date DEFAULT NULL,
  `Rates` text,
  `RatesAnnexureFile` varchar(500) DEFAULT NULL,
  `YearlyEscalationClause` enum('Yes','No') DEFAULT 'No',
  `GSTNo` varchar(15) DEFAULT NULL,
  `GSTRate` decimal(5,2) DEFAULT '18.00',
  `BillingTenure` varchar(50) DEFAULT NULL,
  `MISFormatFile` varchar(500) DEFAULT NULL,
  `KPISLAFile` varchar(500) DEFAULT NULL,
  `PerformanceReportFile` varchar(500) DEFAULT NULL,
  `CustomerRegisteredOfficeAddress` text,
  `CustomerCorporateOfficeAddress` text,
  `CogentProjectHead` varchar(255) DEFAULT NULL,
  `CogentProjectOpsManager` varchar(255) DEFAULT NULL,
  `CustomerImportantPersonAddress1` text,
  `CustomerImportantPersonAddress2` text,
  PRIMARY KEY (`CustomerID`),
  UNIQUE KEY `CustomerCode` (`CustomerCode`),
  KEY `idx_customer_group` (`CustomerGroup`),
  KEY `idx_agreement_expiry` (`AgreementExpiryDate`),
  KEY `idx_bg_expiry` (`BGExpiryDate`),
  KEY `idx_po_expiry` (`POExpiryDate`),
  KEY `idx_gst_no` (`GSTNo`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer_cogent_contact`
--

DROP TABLE IF EXISTS `customer_cogent_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_cogent_contact` (
  `CustomerCogentContactID` int NOT NULL AUTO_INCREMENT,
  `CustomerID` int NOT NULL,
  `CustomerOwner` varchar(255) DEFAULT NULL,
  `ProjectHead` varchar(255) DEFAULT NULL,
  `OpsHead` varchar(255) DEFAULT NULL,
  `OpsManager` varchar(255) DEFAULT NULL,
  `Supervisor` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`CustomerCogentContactID`),
  KEY `CustomerID` (`CustomerID`),
  CONSTRAINT `customer_cogent_contact_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer_key_contact`
--

DROP TABLE IF EXISTS `customer_key_contact`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_key_contact` (
  `CustomerKeyContactID` int NOT NULL AUTO_INCREMENT,
  `CustomerID` int NOT NULL,
  `Name` varchar(255) DEFAULT NULL,
  `Department` varchar(255) DEFAULT NULL,
  `Designation` varchar(255) DEFAULT NULL,
  `Location` varchar(255) DEFAULT NULL,
  `OfficeType` varchar(100) DEFAULT NULL,
  `Mobile` varchar(15) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `DOB` date DEFAULT NULL,
  `Address` text,
  PRIMARY KEY (`CustomerKeyContactID`),
  KEY `CustomerID` (`CustomerID`),
  CONSTRAINT `customer_key_contact_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer_office_address`
--

DROP TABLE IF EXISTS `customer_office_address`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_office_address` (
  `CustomerOfficeAddressID` int NOT NULL AUTO_INCREMENT,
  `CustomerID` int NOT NULL,
  `OfficeType` varchar(100) DEFAULT NULL,
  `ContactPerson` varchar(255) DEFAULT NULL,
  `Department` varchar(255) DEFAULT NULL,
  `Designation` varchar(255) DEFAULT NULL,
  `Mobile` varchar(15) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `DOB` date DEFAULT NULL,
  `Address` text,
  PRIMARY KEY (`CustomerOfficeAddressID`),
  KEY `CustomerID` (`CustomerID`),
  CONSTRAINT `customer_office_address_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `driver`
--

DROP TABLE IF EXISTS `driver`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver` (
  `DriverID` int NOT NULL AUTO_INCREMENT,
  `DriverName` varchar(255) NOT NULL,
  `DriverLicenceNo` varchar(50) NOT NULL,
  `VendorID` int DEFAULT NULL,
  `DriverMobileNo` varchar(15) DEFAULT NULL,
  `DriverAddress` text,
  `HouseFlatNo` varchar(100) DEFAULT NULL,
  `StreetLocality` varchar(255) DEFAULT NULL,
  `DriverCity` varchar(100) DEFAULT NULL,
  `DriverState` varchar(100) DEFAULT NULL,
  `DriverPinCode` varchar(6) DEFAULT NULL,
  `DriverCountry` varchar(100) DEFAULT 'India',
  `MedicalDate` date DEFAULT NULL,
  `LicenceExpiry` date DEFAULT NULL,
  `Status` enum('Active','Inactive','On Leave') DEFAULT 'Active',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `DriverSameAsVendor` enum('Same as Vendor','Separate') DEFAULT 'Separate',
  `DriverAlternateNo` varchar(15) DEFAULT NULL,
  `DriverLicenceIssueDate` date DEFAULT NULL,
  `DriverTotalExperience` int DEFAULT NULL,
  `DriverPhoto` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`DriverID`),
  UNIQUE KEY `DriverLicenceNo` (`DriverLicenceNo`),
  KEY `VendorID` (`VendorID`),
  KEY `idx_driver_status` (`Status`),
  CONSTRAINT `driver_ibfk_1` FOREIGN KEY (`VendorID`) REFERENCES `vendor` (`VendorID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `final_inspection_details`
--

DROP TABLE IF EXISTS `final_inspection_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_inspection_details` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ic_id` bigint NOT NULL COMMENT 'Foreign key to inspection_calls.id',
  `rm_ic_id` bigint NOT NULL COMMENT 'Foreign key to parent RM inspection_calls.id',
  `rm_ic_number` varchar(50) NOT NULL COMMENT 'Parent RM IC Number for reference',
  `process_ic_id` bigint NOT NULL COMMENT 'Foreign key to parent Process inspection_calls.id',
  `process_ic_number` varchar(50) NOT NULL COMMENT 'Parent Process IC Number for reference',
  `company_id` int NOT NULL COMMENT 'Company ID (same as RM IC & Process IC)',
  `company_name` varchar(255) NOT NULL COMMENT 'Company name (same as RM IC & Process IC)',
  `unit_id` int NOT NULL COMMENT 'Unit ID (same as RM IC & Process IC)',
  `unit_name` varchar(255) NOT NULL COMMENT 'Unit name (same as RM IC & Process IC)',
  `unit_address` text COMMENT 'Unit address (same as RM IC & Process IC)',
  `total_lots` int NOT NULL DEFAULT '0' COMMENT 'Total number of lots in this final IC',
  `total_offered_qty` int NOT NULL DEFAULT '0' COMMENT 'Total quantity offered across all lots',
  `total_accepted_qty` int DEFAULT NULL COMMENT 'Total quantity accepted after final inspection',
  `total_rejected_qty` int DEFAULT NULL COMMENT 'Total quantity rejected after final inspection',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ic_id` (`ic_id`),
  KEY `idx_ic_id` (`ic_id`),
  KEY `idx_rm_ic_id` (`rm_ic_id`),
  KEY `idx_rm_ic_number` (`rm_ic_number`),
  KEY `idx_process_ic_id` (`process_ic_id`),
  KEY `idx_process_ic_number` (`process_ic_number`),
  CONSTRAINT `final_inspection_details_ibfk_1` FOREIGN KEY (`ic_id`) REFERENCES `inspection_calls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `final_inspection_details_ibfk_2` FOREIGN KEY (`rm_ic_id`) REFERENCES `inspection_calls` (`id`),
  CONSTRAINT `final_inspection_details_ibfk_3` FOREIGN KEY (`process_ic_id`) REFERENCES `inspection_calls` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `final_inspection_lot_details`
--

DROP TABLE IF EXISTS `final_inspection_lot_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_inspection_lot_details` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `final_detail_id` bigint NOT NULL COMMENT 'Foreign key to final_inspection_details.id',
  `lot_number` varchar(100) NOT NULL COMMENT 'Lot number selected from Process IC',
  `heat_number` varchar(50) NOT NULL COMMENT 'Heat number from RM IC',
  `manufacturer` varchar(255) DEFAULT NULL COMMENT 'Manufacturer name',
  `manufacturer_heat` varchar(255) NOT NULL COMMENT 'Combined Manufacturer - Heat Number format',
  `offered_qty` int NOT NULL COMMENT 'Quantity offered for this lot (No. of ERCs)',
  `qty_accepted` int DEFAULT NULL COMMENT 'Quantity accepted for this lot',
  `qty_rejected` int DEFAULT NULL COMMENT 'Quantity rejected for this lot',
  `rejection_reason` text COMMENT 'Reason for rejection if any',
  `process_ic_id` bigint DEFAULT NULL COMMENT 'Reference to process IC for this lot',
  `process_ic_number` varchar(50) DEFAULT NULL COMMENT 'Process IC number for reference',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_final_detail_id` (`final_detail_id`),
  KEY `idx_lot_number` (`lot_number`),
  KEY `idx_heat_number` (`heat_number`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_process_ic_id` (`process_ic_id`),
  CONSTRAINT `final_inspection_lot_details_ibfk_1` FOREIGN KEY (`final_detail_id`) REFERENCES `final_inspection_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `final_inspection_lot_details_ibfk_2` FOREIGN KEY (`process_ic_id`) REFERENCES `inspection_calls` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `final_process_ic_mapping`
--

DROP TABLE IF EXISTS `final_process_ic_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_process_ic_mapping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `final_ic_id` bigint NOT NULL COMMENT 'Foreign key to final inspection_calls.id',
  `process_ic_id` bigint NOT NULL COMMENT 'Foreign key to process inspection_calls.id',
  `process_ic_number` varchar(50) NOT NULL COMMENT 'Process IC Number',
  `lot_number` varchar(100) NOT NULL COMMENT 'Lot number from Process IC',
  `heat_number` varchar(50) NOT NULL COMMENT 'Heat number',
  `manufacturer` varchar(255) DEFAULT NULL COMMENT 'Manufacturer name',
  `process_qty_accepted` int NOT NULL COMMENT 'Quantity accepted in Process inspection',
  `process_ic_date` date DEFAULT NULL COMMENT 'Process IC date for reference',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_final_ic_id` (`final_ic_id`),
  KEY `idx_process_ic_id` (`process_ic_id`),
  KEY `idx_process_ic_number` (`process_ic_number`),
  KEY `idx_lot_number` (`lot_number`),
  CONSTRAINT `final_process_ic_mapping_ibfk_1` FOREIGN KEY (`final_ic_id`) REFERENCES `inspection_calls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `final_process_ic_mapping_ibfk_2` FOREIGN KEY (`process_ic_id`) REFERENCES `inspection_calls` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fixed_transactions`
--

DROP TABLE IF EXISTS `fixed_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixed_transactions` (
  `TransactionID` int NOT NULL AUTO_INCREMENT,
  `TripType` varchar(10) DEFAULT 'Fixed',
  `TransactionDate` date NOT NULL,
  `Shift` varchar(20) DEFAULT NULL,
  `VehicleIDs` json DEFAULT NULL,
  `DriverIDs` json DEFAULT NULL,
  `VendorID` int DEFAULT NULL,
  `CustomerID` int NOT NULL,
  `ProjectID` int DEFAULT NULL,
  `LocationID` int DEFAULT NULL,
  `ReplacementDriverID` int DEFAULT NULL,
  `ReplacementDriverName` varchar(100) DEFAULT NULL,
  `ReplacementDriverNo` varchar(10) DEFAULT NULL,
  `ArrivalTimeAtHub` time DEFAULT NULL,
  `InTimeByCust` time DEFAULT NULL,
  `OutTimeFromHub` time DEFAULT NULL,
  `ReturnReportingTime` time DEFAULT NULL,
  `OpeningKM` decimal(10,2) NOT NULL,
  `ClosingKM` decimal(10,2) NOT NULL,
  `TotalDeliveries` int DEFAULT NULL,
  `TotalDeliveriesAttempted` int DEFAULT NULL,
  `TotalDeliveriesDone` int DEFAULT NULL,
  `TotalDutyHours` decimal(5,2) DEFAULT NULL,
  `VFreightFix` decimal(10,2) DEFAULT NULL,
  `FixKm` decimal(10,2) DEFAULT NULL,
  `VFreightVariable` decimal(10,2) DEFAULT NULL,
  `TotalFreight` decimal(10,2) DEFAULT NULL,
  `TollExpenses` decimal(10,2) DEFAULT NULL,
  `ParkingCharges` decimal(10,2) DEFAULT NULL,
  `LoadingCharges` decimal(10,2) DEFAULT NULL,
  `UnloadingCharges` decimal(10,2) DEFAULT NULL,
  `OtherCharges` decimal(10,2) DEFAULT NULL,
  `OtherChargesRemarks` text,
  `AdvanceRequestNo` varchar(50) DEFAULT NULL,
  `AdvanceToPaid` decimal(10,2) DEFAULT NULL,
  `AdvanceApprovedAmount` decimal(10,2) DEFAULT NULL,
  `AdvanceApprovedBy` varchar(100) DEFAULT NULL,
  `AdvancePaidAmount` decimal(10,2) DEFAULT NULL,
  `AdvancePaidMode` varchar(20) DEFAULT NULL,
  `AdvancePaidDate` date DEFAULT NULL,
  `AdvancePaidBy` varchar(100) DEFAULT NULL,
  `EmployeeDetailsAdvance` text,
  `BalanceToBePaid` decimal(10,2) DEFAULT NULL,
  `BalancePaidAmount` decimal(10,2) DEFAULT NULL,
  `Variance` decimal(10,2) DEFAULT NULL,
  `BalancePaidDate` date DEFAULT NULL,
  `BalancePaidBy` varchar(100) DEFAULT NULL,
  `EmployeeDetailsBalance` text,
  `Revenue` decimal(10,2) DEFAULT NULL,
  `Margin` decimal(10,2) DEFAULT NULL,
  `MarginPercentage` decimal(5,2) DEFAULT NULL,
  `DriverAadharDoc` varchar(255) DEFAULT NULL,
  `DriverLicenceDoc` varchar(255) DEFAULT NULL,
  `TollExpensesDoc` varchar(255) DEFAULT NULL,
  `ParkingChargesDoc` varchar(255) DEFAULT NULL,
  `OpeningKMImage` varchar(255) DEFAULT NULL,
  `ClosingKMImage` varchar(255) DEFAULT NULL,
  `OutTimeFrom` time DEFAULT NULL,
  `TotalShipmentsForDeliveries` int DEFAULT NULL,
  `TotalShipmentDeliveriesAttempted` int DEFAULT NULL,
  `TotalShipmentDeliveriesDone` int DEFAULT NULL,
  `TripNo` varchar(50) DEFAULT NULL,
  `VehicleNumber` varchar(20) DEFAULT NULL,
  `VendorName` varchar(100) DEFAULT NULL,
  `VendorNumber` varchar(20) DEFAULT NULL,
  `DriverName` varchar(100) DEFAULT NULL,
  `DriverNumber` varchar(20) DEFAULT NULL,
  `DriverAadharNumber` varchar(20) DEFAULT NULL,
  `DriverLicenceNumber` varchar(20) DEFAULT NULL,
  `VehicleType` varchar(50) DEFAULT NULL,
  `HandlingCharges` decimal(10,2) DEFAULT NULL,
  `CompanyName` varchar(100) DEFAULT NULL,
  `GSTNo` varchar(20) DEFAULT NULL,
  `CustomerSite` varchar(255) DEFAULT NULL,
  `Location` varchar(255) DEFAULT NULL,
  `Remarks` text,
  `Status` varchar(20) DEFAULT 'Pending',
  `TripClose` tinyint(1) DEFAULT '0',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `VehicleReportingAtHub` time DEFAULT NULL COMMENT 'Time 1: Vehicle Reporting at Hub/WH (Start of duty)',
  `VehicleEntryInHub` time DEFAULT NULL COMMENT 'Time 2: Vehicle Entry in Hub/WH',
  `VehicleOutFromHubForDelivery` time DEFAULT NULL COMMENT 'Time 3: Vehicle Out from Hub/WH for Delivery',
  `VehicleReturnAtHub` time DEFAULT NULL COMMENT 'Time 4: Vehicle Return at Hub/WH',
  `VehicleEnteredAtHubReturn` time DEFAULT NULL COMMENT 'Time 5: Vehicle Entered at Hub/WH (Return)',
  `VehicleOutFromHubFinal` time DEFAULT NULL COMMENT 'Time 6: Vehicle Out from Hub Final (Trip Close - End of duty)',
  PRIMARY KEY (`TransactionID`),
  KEY `idx_transaction_date` (`TransactionDate`),
  KEY `idx_customer_id` (`CustomerID`),
  KEY `idx_project_id` (`ProjectID`),
  KEY `idx_status` (`Status`),
  KEY `idx_trip_type` (`TripType`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ie_controlling_manager`
--

DROP TABLE IF EXISTS `ie_controlling_manager`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ie_controlling_manager` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ie_employee_code` varchar(50) NOT NULL,
  `cm_user_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ie_fields_mapping`
--

DROP TABLE IF EXISTS `ie_fields_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ie_fields_mapping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `pin_code` varchar(10) NOT NULL,
  `product` varchar(50) NOT NULL,
  `stage` varchar(50) NOT NULL,
  `rio` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ie_pincode_poi_mapping`
--

DROP TABLE IF EXISTS `ie_pincode_poi_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ie_pincode_poi_mapping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) NOT NULL,
  `product` varchar(50) NOT NULL,
  `pin_code` varchar(10) NOT NULL,
  `poi_code` varchar(50) NOT NULL,
  `ie_type` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ie_profile`
--

DROP TABLE IF EXISTS `ie_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ie_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) NOT NULL,
  `rio` varchar(20) DEFAULT NULL,
  `current_city_of_posting` varchar(100) DEFAULT NULL,
  `metal_stamp_no` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ie_profile_user` (`employee_code`),
  CONSTRAINT `fk_ie_profile_user` FOREIGN KEY (`employee_code`) REFERENCES `user_master` (`EMPLOYEE_CODE`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ifsc_cache`
--

DROP TABLE IF EXISTS `ifsc_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ifsc_cache` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ifsc_code` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `micr_code` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `swift_code` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cached_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_permanent` tinyint(1) DEFAULT '0' COMMENT 'True for manually maintained/verified records',
  `is_active` tinyint(1) DEFAULT '1',
  `data_source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'api' COMMENT 'Source: api, manual, rbi, npci',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ifsc_code` (`ifsc_code`),
  KEY `idx_ifsc_code` (`ifsc_code`),
  KEY `idx_bank_name` (`bank_name`),
  KEY `idx_city_state` (`city`,`state`),
  KEY `idx_cached_at` (`cached_at`),
  KEY `idx_active` (`is_active`),
  KEY `idx_ifsc_lookup` (`ifsc_code`,`is_active`),
  KEY `idx_bank_search` (`bank_name`,`city`,`state`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inspection_call_details`
--

DROP TABLE IF EXISTS `inspection_call_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspection_call_details` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `inspection_call_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `inspection_call_date` date DEFAULT NULL,
  `inspection_desired_date` date DEFAULT NULL,
  `rly_po_no_sr` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `product_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `po_qty` decimal(15,3) DEFAULT NULL,
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consignee_rly` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consignee` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orig_dp` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ext_dp` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orig_dp_start` date DEFAULT NULL,
  `stage_of_inspection` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `call_qty` decimal(15,3) DEFAULT NULL,
  `place_of_inspection` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rm_ic_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `process_ic_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `rejection_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `main_po_id` bigint DEFAULT NULL,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_date` datetime NOT NULL,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inspection_call_no` (`inspection_call_no`),
  KEY `idx_call_details_call_no` (`inspection_call_no`),
  KEY `idx_call_details_status` (`status`),
  KEY `fk_call_details_main_po` (`main_po_id`),
  CONSTRAINT `fk_call_details_main_po` FOREIGN KEY (`main_po_id`) REFERENCES `main_po_information` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inspection_calls`
--

DROP TABLE IF EXISTS `inspection_calls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspection_calls` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_id` varchar(50) DEFAULT NULL COMMENT 'Vendor Code (String, e.g. 13104)',
  `ic_number` varchar(50) NOT NULL COMMENT 'Auto-generated IC Number',
  `po_no` varchar(50) NOT NULL COMMENT 'Purchase Order Number',
  `po_serial_no` varchar(20) NOT NULL COMMENT 'PO Serial Number',
  `type_of_call` varchar(30) NOT NULL COMMENT 'Raw Material / Process / Final',
  `status` varchar(30) NOT NULL DEFAULT 'Pending',
  `desired_inspection_date` date NOT NULL,
  `actual_inspection_date` date DEFAULT NULL,
  `place_of_inspection` varchar(255) DEFAULT NULL,
  `company_id` int NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `unit_id` int NOT NULL,
  `unit_name` varchar(255) NOT NULL,
  `unit_address` text,
  `remarks` text,
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `erc_type` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ic_number` (`ic_number`),
  KEY `idx_vendor_id` (`vendor_id`),
  KEY `idx_po_no` (`po_no`),
  KEY `idx_po_serial_no` (`po_serial_no`),
  KEY `idx_type_of_call` (`type_of_call`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inspection_initiation`
--

DROP TABLE IF EXISTS `inspection_initiation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspection_initiation` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `action_date` datetime(6) DEFAULT NULL,
  `action_reason` varchar(50) DEFAULT NULL,
  `action_remarks` text,
  `action_type` varchar(20) DEFAULT NULL,
  `call_no` varchar(50) DEFAULT NULL,
  `cm_approval` bit(1) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `date_of_inspection` date DEFAULT NULL,
  `initiated_at` datetime(6) DEFAULT NULL,
  `initiated_by` varchar(50) DEFAULT NULL,
  `inspection_request_id` bigint DEFAULT NULL,
  `multiple_lines_active` bit(1) DEFAULT NULL,
  `offered_qty` decimal(15,3) DEFAULT NULL,
  `po_no` varchar(50) DEFAULT NULL,
  `product_type` varchar(50) DEFAULT NULL,
  `production_lines_json` text,
  `section_a_verified` bit(1) DEFAULT NULL,
  `section_b_verified` bit(1) DEFAULT NULL,
  `section_c_verified` bit(1) DEFAULT NULL,
  `section_d_verified` bit(1) DEFAULT NULL,
  `shift_of_inspection` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_init_inspection_request_id` (`inspection_request_id`),
  KEY `idx_init_call_no` (`call_no`),
  KEY `idx_init_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inspection_schedule`
--

DROP TABLE IF EXISTS `inspection_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspection_schedule` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `call_no` varchar(50) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `schedule_date` date NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK5o12rsvqxmoyewc3j9p3y47hp` (`call_no`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory_entries`
--

DROP TABLE IF EXISTS `inventory_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_entries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_code` varchar(50) NOT NULL,
  `vendor_name` varchar(150) DEFAULT NULL,
  `company_id` bigint DEFAULT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `unit_name` varchar(150) NOT NULL,
  `supplier_address` varchar(255) DEFAULT NULL,
  `raw_material` varchar(150) NOT NULL,
  `grade_specification` varchar(100) NOT NULL,
  `length_of_bars` decimal(10,2) DEFAULT NULL,
  `heat_number` varchar(100) NOT NULL,
  `tc_number` varchar(100) NOT NULL,
  `tc_date` date NOT NULL,
  `tc_quantity` decimal(12,3) NOT NULL,
  `sub_po_number` varchar(100) NOT NULL,
  `sub_po_date` date DEFAULT NULL,
  `sub_po_qty` decimal(12,3) NOT NULL,
  `invoice_number` varchar(100) NOT NULL,
  `invoice_date` date NOT NULL,
  `unit_of_measurement` varchar(50) NOT NULL,
  `rate_of_material` decimal(12,2) DEFAULT NULL,
  `rate_of_gst` decimal(5,2) DEFAULT NULL,
  `base_value_po` decimal(14,2) DEFAULT NULL,
  `total_po` decimal(14,2) DEFAULT NULL,
  `status` enum('FRESH_PO','UNDER_INSPECTION','ACCEPTED','REJECTED') DEFAULT 'FRESH_PO',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `location`
--

DROP TABLE IF EXISTS `location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `location` (
  `LocationID` int NOT NULL AUTO_INCREMENT,
  `CustomerID` int NOT NULL,
  `LocationName` varchar(255) NOT NULL,
  `Address` text,
  `LocationCode` varchar(100) DEFAULT NULL,
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`LocationID`),
  UNIQUE KEY `LocationCode` (`LocationCode`),
  KEY `CustomerID` (`CustomerID`),
  CONSTRAINT `location_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `main_po_information`
--

DROP TABLE IF EXISTS `main_po_information`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `main_po_information` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `inspection_call_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `po_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `vendor_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vendor_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vendor_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `place_of_inspection` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manufacturer` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consignee_rly` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `consignee` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `po_qty` decimal(15,3) DEFAULT NULL,
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orig_dp` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ext_dp` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `orig_dp_start` date DEFAULT NULL,
  `bpo` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_inspection` date DEFAULT NULL,
  `shift_of_inspection` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `offered_qty` decimal(15,3) DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `rejection_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_date` datetime NOT NULL,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inspection_call_no` (`inspection_call_no`),
  KEY `idx_main_po_call_no` (`inspection_call_no`),
  KEY `idx_main_po_po_no` (`po_no`),
  KEY `idx_main_po_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `paymentcollection`
--

DROP TABLE IF EXISTS `paymentcollection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paymentcollection` (
  `PaymentID` int NOT NULL AUTO_INCREMENT,
  `BillingID` int NOT NULL,
  `PaymentDate` date NOT NULL,
  `PaymentAmount` decimal(15,2) NOT NULL,
  `PaymentMode` enum('Cash','Cheque','Online Transfer','UPI','Bank') NOT NULL,
  `PaymentReference` varchar(255) DEFAULT NULL,
  `Remarks` text,
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`PaymentID`),
  KEY `BillingID` (`BillingID`),
  KEY `idx_payment_date` (`PaymentDate`),
  KEY `idx_payment_mode` (`PaymentMode`),
  CONSTRAINT `paymentcollection_ibfk_1` FOREIGN KEY (`BillingID`) REFERENCES `billing` (`BillingID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pincode_cluster`
--

DROP TABLE IF EXISTS `pincode_cluster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pincode_cluster` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cluster_name` varchar(255) DEFAULT NULL,
  `created_date` datetime(6) DEFAULT NULL,
  `pincode` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pincode_lookup`
--

DROP TABLE IF EXISTS `pincode_lookup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pincode_lookup` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pincode` varchar(6) NOT NULL,
  `area` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `district` varchar(100) DEFAULT NULL,
  `state` varchar(100) NOT NULL,
  `country` varchar(100) DEFAULT 'India',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pincode_area` (`pincode`,`area`),
  KEY `idx_pincode` (`pincode`),
  KEY `idx_city` (`city`),
  KEY `idx_state` (`state`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pincode_poi_mapping`
--

DROP TABLE IF EXISTS `pincode_poi_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pincode_poi_mapping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `pin_code` varchar(10) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `cin` varchar(50) DEFAULT NULL,
  `unit_name` varchar(255) DEFAULT NULL,
  `address` varchar(1000) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `poi_code` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `poi_code` (`poi_code`)
) ENGINE=InnoDB AUTO_INCREMENT=241 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `po_cancellation_detail`
--

DROP TABLE IF EXISTS `po_cancellation_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_cancellation_detail` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `header_id` bigint NOT NULL,
  `rly` varchar(10) DEFAULT NULL,
  `cakey` varchar(50) DEFAULT NULL,
  `slno` varchar(20) DEFAULT NULL,
  `pl_no` varchar(50) DEFAULT NULL,
  `po_sr` varchar(20) DEFAULT NULL,
  `po_bal_qty` decimal(15,3) DEFAULT NULL,
  `canc_qty` decimal(15,3) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `dem_status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_po_cancel_hdr` (`header_id`),
  CONSTRAINT `fk_po_cancel_hdr` FOREIGN KEY (`header_id`) REFERENCES `po_cancellation_header` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `po_cancellation_header`
--

DROP TABLE IF EXISTS `po_cancellation_header`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_cancellation_header` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rly` varchar(10) DEFAULT NULL,
  `cakey` varchar(50) DEFAULT NULL,
  `cakey_date` date DEFAULT NULL,
  `pokey` varchar(50) DEFAULT NULL,
  `po_no` varchar(50) DEFAULT NULL,
  `ca_no` varchar(50) DEFAULT NULL,
  `ca_date` date DEFAULT NULL,
  `ca_type` varchar(10) DEFAULT NULL,
  `vcode` varchar(50) DEFAULT NULL,
  `ref_no` varchar(50) DEFAULT NULL,
  `ref_date` date DEFAULT NULL,
  `remarks` text,
  `ca_sign_off` varchar(50) DEFAULT NULL,
  `request_id` varchar(50) DEFAULT NULL,
  `auth_seq` varchar(50) DEFAULT NULL,
  `auth_seq_fin` varchar(50) DEFAULT NULL,
  `curuser` varchar(50) DEFAULT NULL,
  `curuser_ind` varchar(10) DEFAULT NULL,
  `sign_id` varchar(50) DEFAULT NULL,
  `req_id` varchar(50) DEFAULT NULL,
  `fin_status` varchar(20) DEFAULT NULL,
  `rec_ind` varchar(10) DEFAULT NULL,
  `flag` varchar(10) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `pur_div` varchar(20) DEFAULT NULL,
  `pur_sec` varchar(20) DEFAULT NULL,
  `old_po_value` decimal(15,2) DEFAULT NULL,
  `new_po_value` decimal(15,2) DEFAULT NULL,
  `recovery_amt` decimal(15,2) DEFAULT NULL,
  `recadv_no` varchar(50) DEFAULT NULL,
  `po_ma_srno` varchar(20) DEFAULT NULL,
  `ca_reason` varchar(20) DEFAULT NULL,
  `reinst_no` varchar(50) DEFAULT NULL,
  `reinst_date` date DEFAULT NULL,
  `reinst_remarks` text,
  `publish_flag` varchar(10) DEFAULT NULL,
  `sent4vet` varchar(10) DEFAULT NULL,
  `vet_date` date DEFAULT NULL,
  `vet_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `po_header`
--

DROP TABLE IF EXISTS `po_header`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_header` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `po_key` varchar(30) NOT NULL,
  `po_no` varchar(30) DEFAULT NULL,
  `l5_po_no` varchar(30) DEFAULT NULL,
  `rly_cd` varchar(5) DEFAULT NULL,
  `rly_short_name` varchar(10) DEFAULT NULL,
  `purchaser_code` varchar(20) DEFAULT NULL,
  `purchaser_detail` varchar(500) DEFAULT NULL,
  `stock_non_stock` varchar(2) DEFAULT NULL,
  `rly_non_rly` varchar(2) DEFAULT NULL,
  `po_or_letter` varchar(2) DEFAULT NULL,
  `vendor_code` varchar(20) DEFAULT NULL,
  `vendor_details` varchar(500) DEFAULT NULL,
  `firm_details` varchar(300) DEFAULT NULL,
  `inspecting_agency` varchar(50) DEFAULT NULL,
  `po_status` varchar(10) DEFAULT NULL,
  `pdf_path` varchar(500) DEFAULT NULL,
  `po_date` datetime DEFAULT NULL,
  `received_date` datetime DEFAULT NULL,
  `cris_timestamp` datetime DEFAULT NULL,
  `user_id` varchar(20) DEFAULT NULL,
  `source_system` varchar(10) DEFAULT NULL,
  `l5po_no` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_key` (`po_key`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `po_item`
--

DROP TABLE IF EXISTS `po_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_item` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `po_header_id` bigint NOT NULL,
  `rly` varchar(5) DEFAULT NULL,
  `case_no` varchar(30) DEFAULT NULL,
  `item_sr_no` varchar(10) DEFAULT NULL,
  `pl_no` varchar(30) DEFAULT NULL,
  `item_desc` longtext,
  `consignee_cd` varchar(20) DEFAULT NULL,
  `imms_consignee_cd` varchar(20) DEFAULT NULL,
  `imms_consignee_name` varchar(100) DEFAULT NULL,
  `consignee_detail` varchar(300) DEFAULT NULL,
  `qty` int DEFAULT NULL,
  `qty_cancelled` int DEFAULT NULL,
  `uom_cd` varchar(10) DEFAULT NULL,
  `uom` varchar(20) DEFAULT NULL,
  `rate` decimal(15,2) DEFAULT NULL,
  `basic_value` decimal(15,2) DEFAULT NULL,
  `sales_tax_percent` decimal(10,2) DEFAULT NULL,
  `sales_tax` decimal(15,2) DEFAULT NULL,
  `discount_type` varchar(5) DEFAULT NULL,
  `discount_percent` decimal(10,2) DEFAULT NULL,
  `discount` decimal(15,2) DEFAULT NULL,
  `value` decimal(15,2) DEFAULT NULL,
  `ot_charge_type` varchar(10) DEFAULT NULL,
  `ot_charge_percent` decimal(10,2) DEFAULT NULL,
  `other_charges` decimal(15,2) DEFAULT NULL,
  `delivery_date` datetime DEFAULT NULL,
  `extended_delivery_date` datetime DEFAULT NULL,
  `cris_timestamp` datetime DEFAULT NULL,
  `allocation` varchar(30) DEFAULT NULL,
  `user_id` varchar(20) DEFAULT NULL,
  `source_system` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_po_item_header` (`po_header_id`),
  CONSTRAINT `fk_po_item_header` FOREIGN KEY (`po_header_id`) REFERENCES `po_header` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `po_ma_detail`
--

DROP TABLE IF EXISTS `po_ma_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_ma_detail` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ma_key` varchar(30) DEFAULT NULL,
  `rly` varchar(10) DEFAULT NULL,
  `slno` varchar(10) DEFAULT NULL,
  `ma_fld` varchar(50) DEFAULT NULL,
  `ma_fld_descr` varchar(200) DEFAULT NULL,
  `old_value` varchar(500) DEFAULT NULL,
  `new_value` varchar(500) DEFAULT NULL,
  `new_value_ind` varchar(5) DEFAULT NULL,
  `new_value_flag` varchar(5) DEFAULT NULL,
  `pl_no` varchar(30) DEFAULT NULL,
  `po_sr` varchar(10) DEFAULT NULL,
  `cond_slno` varchar(10) DEFAULT NULL,
  `cond_code` varchar(20) DEFAULT NULL,
  `ma_sr_no` varchar(10) DEFAULT NULL,
  `status` varchar(5) DEFAULT NULL,
  `source_system` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ma_dtl_hdr` (`ma_key`),
  CONSTRAINT `fk_ma_dtl_hdr` FOREIGN KEY (`ma_key`) REFERENCES `po_ma_header` (`ma_key`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `po_ma_header`
--

DROP TABLE IF EXISTS `po_ma_header`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_ma_header` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ma_key` varchar(30) NOT NULL,
  `rly` varchar(10) DEFAULT NULL,
  `ma_key_date` date DEFAULT NULL,
  `po_key` varchar(30) DEFAULT NULL,
  `po_no` varchar(50) DEFAULT NULL,
  `ma_no` varchar(30) DEFAULT NULL,
  `ma_date` date DEFAULT NULL,
  `ma_type` varchar(20) DEFAULT NULL,
  `vcode` varchar(30) DEFAULT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `ma_sign_off` varchar(30) DEFAULT NULL,
  `fin_status` varchar(5) DEFAULT NULL,
  `status` varchar(5) DEFAULT NULL,
  `pur_div` varchar(20) DEFAULT NULL,
  `pur_sec` varchar(20) DEFAULT NULL,
  `old_po_value` decimal(15,2) DEFAULT NULL,
  `new_po_value` decimal(15,2) DEFAULT NULL,
  `po_ma_srno` varchar(10) DEFAULT NULL,
  `publish_flag` varchar(5) DEFAULT NULL,
  `sent4vet` date DEFAULT NULL,
  `vet_date` date DEFAULT NULL,
  `vet_by` varchar(30) DEFAULT NULL,
  `source_system` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ma_key` (`ma_key`),
  KEY `fk_ma_po` (`po_key`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_ie_mapping`
--

DROP TABLE IF EXISTS `process_ie_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_ie_mapping` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_by` varchar(255) DEFAULT NULL,
  `created_date` datetime(6) DEFAULT NULL,
  `ie_user_id` int NOT NULL,
  `process_ie_user_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_ie_master`
--

DROP TABLE IF EXISTS `process_ie_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_ie_master` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cluster_name` varchar(255) NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_date` datetime(6) DEFAULT NULL,
  `process_ie_user_id` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_inspection_details`
--

DROP TABLE IF EXISTS `process_inspection_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_inspection_details` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ic_id` bigint NOT NULL COMMENT 'Foreign key to inspection_calls.id',
  `rm_ic_id` bigint NOT NULL COMMENT 'Foreign key to parent RM inspection_calls.id',
  `rm_ic_number` varchar(50) NOT NULL COMMENT 'Parent RM IC Number for reference',
  `lot_number` varchar(100) NOT NULL COMMENT 'Lot number entered by vendor',
  `heat_number` varchar(50) NOT NULL COMMENT 'Heat number selected from RM IC',
  `manufacturer` varchar(255) DEFAULT NULL COMMENT 'Manufacturer name for the heat',
  `manufacturer_heat` varchar(255) NOT NULL COMMENT 'Combined Manufacturer - Heat Number format',
  `offered_qty` int NOT NULL COMMENT 'Quantity offered for process inspection (in pieces/ERCs)',
  `total_accepted_qty_rm` int NOT NULL DEFAULT '0' COMMENT 'Total accepted quantity from RM inspection',
  `qty_accepted` int DEFAULT NULL COMMENT 'Quantity accepted after process inspection',
  `qty_rejected` int DEFAULT NULL COMMENT 'Quantity rejected after process inspection',
  `rejection_reason` text COMMENT 'Reason for rejection if any',
  `company_id` int NOT NULL COMMENT 'Company ID (same as RM IC)',
  `company_name` varchar(255) NOT NULL COMMENT 'Company name (same as RM IC)',
  `unit_id` int NOT NULL COMMENT 'Unit ID (same as RM IC)',
  `unit_name` varchar(255) NOT NULL COMMENT 'Unit name (same as RM IC)',
  `unit_address` text COMMENT 'Unit address (same as RM IC)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ic_id` (`ic_id`),
  KEY `idx_ic_id` (`ic_id`),
  KEY `idx_rm_ic_id` (`rm_ic_id`),
  KEY `idx_rm_ic_number` (`rm_ic_number`),
  KEY `idx_lot_number` (`lot_number`),
  KEY `idx_heat_number` (`heat_number`),
  KEY `idx_manufacturer` (`manufacturer`),
  CONSTRAINT `process_inspection_details_ibfk_1` FOREIGN KEY (`ic_id`) REFERENCES `inspection_calls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `process_inspection_details_ibfk_2` FOREIGN KEY (`rm_ic_id`) REFERENCES `inspection_calls` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_rm_ic_mapping`
--

DROP TABLE IF EXISTS `process_rm_ic_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_rm_ic_mapping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `process_ic_id` bigint NOT NULL COMMENT 'Foreign key to process inspection_calls.id',
  `rm_ic_id` bigint NOT NULL COMMENT 'Foreign key to RM inspection_calls.id',
  `rm_ic_number` varchar(50) NOT NULL COMMENT 'RM IC Number',
  `heat_number` varchar(50) NOT NULL COMMENT 'Heat number from RM IC',
  `manufacturer` varchar(255) DEFAULT NULL COMMENT 'Manufacturer name',
  `book_set_no` varchar(50) DEFAULT NULL COMMENT 'Book/Set number if applicable',
  `rm_qty_accepted` int NOT NULL COMMENT 'Quantity accepted in RM inspection',
  `rm_ic_date` date DEFAULT NULL COMMENT 'RM IC date for reference',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_process_ic_id` (`process_ic_id`),
  KEY `idx_rm_ic_id` (`rm_ic_id`),
  KEY `idx_rm_ic_number` (`rm_ic_number`),
  KEY `idx_heat_number` (`heat_number`),
  CONSTRAINT `process_rm_ic_mapping_ibfk_1` FOREIGN KEY (`process_ic_id`) REFERENCES `inspection_calls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `process_rm_ic_mapping_ibfk_2` FOREIGN KEY (`rm_ic_id`) REFERENCES `inspection_calls` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project`
--

DROP TABLE IF EXISTS `project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project` (
  `ProjectID` int NOT NULL AUTO_INCREMENT,
  `ProjectName` varchar(255) NOT NULL,
  `CustomerID` int NOT NULL,
  `ProjectCode` varchar(100) DEFAULT NULL,
  `ProjectDescription` text,
  `LocationID` int DEFAULT NULL,
  `Location` varchar(255) DEFAULT NULL,
  `ProjectValue` decimal(15,2) DEFAULT NULL,
  `StartDate` date DEFAULT NULL,
  `EndDate` date DEFAULT NULL,
  `Status` enum('Active','Inactive','Completed') DEFAULT 'Active',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProjectID`),
  UNIQUE KEY `ProjectCode` (`ProjectCode`),
  KEY `CustomerID` (`CustomerID`),
  KEY `LocationID` (`LocationID`),
  CONSTRAINT `project_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`) ON DELETE CASCADE,
  CONSTRAINT `project_ibfk_2` FOREIGN KEY (`LocationID`) REFERENCES `location` (`LocationID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `region_cluster`
--

DROP TABLE IF EXISTS `region_cluster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `region_cluster` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cluster_name` varchar(255) DEFAULT NULL,
  `created_date` datetime(6) DEFAULT NULL,
  `region_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `region_sbu_head`
--

DROP TABLE IF EXISTS `region_sbu_head`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `region_sbu_head` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_date` datetime(6) DEFAULT NULL,
  `region_name` varchar(255) DEFAULT NULL,
  `sbu_head_user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rio_user`
--

DROP TABLE IF EXISTS `rio_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rio_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) NOT NULL,
  `rio` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_calibration_documents`
--

DROP TABLE IF EXISTS `rm_calibration_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_calibration_documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `gauges_available` bit(1) DEFAULT NULL,
  `heat_index` int DEFAULT NULL,
  `heat_no` varchar(50) NOT NULL,
  `inspection_call_no` varchar(50) NOT NULL,
  `ladle_carbon_percent` decimal(6,4) DEFAULT NULL,
  `ladle_manganese_percent` decimal(6,4) DEFAULT NULL,
  `ladle_phosphorus_percent` decimal(6,4) DEFAULT NULL,
  `ladle_silicon_percent` decimal(6,4) DEFAULT NULL,
  `ladle_sulphur_percent` decimal(6,4) DEFAULT NULL,
  `rdso_approval_id` varchar(50) DEFAULT NULL,
  `rdso_valid_from` date DEFAULT NULL,
  `rdso_valid_to` date DEFAULT NULL,
  `vendor_verified` bit(1) DEFAULT NULL,
  `verified_at` datetime(6) DEFAULT NULL,
  `verified_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rm_cal_call_no` (`inspection_call_no`),
  KEY `idx_rm_cal_heat_no` (`heat_no`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_chemical_analysis`
--

DROP TABLE IF EXISTS `rm_chemical_analysis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_chemical_analysis` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rm_detail_id` bigint NOT NULL COMMENT 'Foreign key to rm_inspection_details.id',
  `heat_number` varchar(50) NOT NULL COMMENT 'Heat number',
  `carbon` decimal(5,3) DEFAULT NULL COMMENT 'Carbon percentage (C)',
  `manganese` decimal(5,3) DEFAULT NULL COMMENT 'Manganese percentage (Mn)',
  `silicon` decimal(5,3) DEFAULT NULL COMMENT 'Silicon percentage (Si)',
  `sulphur` decimal(5,3) DEFAULT NULL COMMENT 'Sulphur percentage (S)',
  `phosphorus` decimal(5,3) DEFAULT NULL COMMENT 'Phosphorus percentage (P)',
  `chromium` decimal(5,3) DEFAULT NULL COMMENT 'Chromium percentage (Cr)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rm_detail_id` (`rm_detail_id`),
  KEY `idx_heat_number` (`heat_number`),
  CONSTRAINT `rm_chemical_analysis_ibfk_1` FOREIGN KEY (`rm_detail_id`) REFERENCES `rm_inspection_details` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_dimensional_check`
--

DROP TABLE IF EXISTS `rm_dimensional_check`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_dimensional_check` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `diameter` decimal(8,4) DEFAULT NULL,
  `heat_index` int DEFAULT NULL,
  `heat_no` varchar(50) NOT NULL,
  `inspection_call_no` varchar(50) NOT NULL,
  `sample_number` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rm_dim_call_no` (`inspection_call_no`),
  KEY `idx_rm_dim_heat_no` (`heat_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_heat_final_result`
--

DROP TABLE IF EXISTS `rm_heat_final_result`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_heat_final_result` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `calibration_status` varchar(20) DEFAULT NULL,
  `color_code` varchar(50) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `dimensional_status` varchar(20) DEFAULT NULL,
  `heat_index` int DEFAULT NULL,
  `heat_no` varchar(50) NOT NULL,
  `inspection_call_no` varchar(50) NOT NULL,
  `invoice_date` date DEFAULT NULL,
  `invoice_number` varchar(50) DEFAULT NULL,
  `manufacturer_name` varchar(200) DEFAULT NULL,
  `material_test_status` varchar(20) DEFAULT NULL,
  `offered_qty` decimal(12,4) DEFAULT NULL,
  `packing_status` varchar(20) DEFAULT NULL,
  `remarks` text,
  `status` varchar(20) NOT NULL,
  `sub_po_date` date DEFAULT NULL,
  `sub_po_number` varchar(50) DEFAULT NULL,
  `sub_po_qty` decimal(12,4) DEFAULT NULL,
  `tc_date` date DEFAULT NULL,
  `tc_no` varchar(50) DEFAULT NULL,
  `tc_quantity` decimal(12,4) DEFAULT NULL,
  `total_value_of_po` varchar(50) DEFAULT NULL,
  `visual_status` varchar(20) DEFAULT NULL,
  `weight_accepted_mt` decimal(12,4) DEFAULT NULL,
  `weight_offered_mt` decimal(12,4) DEFAULT NULL,
  `weight_rejected_mt` decimal(12,4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rm_heat_call_no` (`inspection_call_no`),
  KEY `idx_rm_heat_heat_no` (`heat_no`),
  KEY `idx_rm_heat_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_heat_quantities`
--

DROP TABLE IF EXISTS `rm_heat_quantities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_heat_quantities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rm_detail_id` bigint NOT NULL COMMENT 'Foreign key to rm_inspection_details.id',
  `heat_number` varchar(50) NOT NULL COMMENT 'Heat number',
  `manufacturer` varchar(255) DEFAULT NULL COMMENT 'Manufacturer name for this heat',
  `offered_qty` decimal(10,3) NOT NULL COMMENT 'Quantity offered for this heat (in MT)',
  `tc_number` varchar(100) DEFAULT NULL COMMENT 'TC number for this heat',
  `tc_date` date DEFAULT NULL COMMENT 'TC date for this heat',
  `tc_quantity` decimal(10,3) DEFAULT NULL COMMENT 'TC quantity for this heat',
  `qty_left` decimal(10,3) DEFAULT NULL COMMENT 'Quantity left after inspection',
  `qty_accepted` decimal(10,3) DEFAULT NULL COMMENT 'Quantity accepted after inspection',
  `qty_rejected` decimal(10,3) DEFAULT NULL COMMENT 'Quantity rejected after inspection',
  `rejection_reason` text COMMENT 'Reason for rejection if any',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `color_code` varchar(50) DEFAULT NULL COMMENT 'Color code manually entered by inspector',
  PRIMARY KEY (`id`),
  KEY `idx_rm_detail_id` (`rm_detail_id`),
  KEY `idx_heat_number` (`heat_number`),
  KEY `idx_manufacturer` (`manufacturer`),
  CONSTRAINT `rm_heat_quantities_ibfk_1` FOREIGN KEY (`rm_detail_id`) REFERENCES `rm_inspection_details` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_heat_tc_mapping`
--

DROP TABLE IF EXISTS `rm_heat_tc_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_heat_tc_mapping` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `inspection_request_id` bigint NOT NULL,
  `heat_number` varchar(50) NOT NULL,
  `tc_number` varchar(50) DEFAULT NULL,
  `tc_date` date DEFAULT NULL,
  `manufacturer` varchar(200) DEFAULT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `sub_po_number` varchar(50) DEFAULT NULL,
  `sub_po_date` date DEFAULT NULL,
  `sub_po_qty` varchar(50) DEFAULT NULL,
  `sub_po_total_value` varchar(50) DEFAULT NULL,
  `tc_qty` varchar(50) DEFAULT NULL,
  `tc_qty_remaining` varchar(50) DEFAULT NULL,
  `offered_qty` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inspection_request_id` (`inspection_request_id`),
  KEY `idx_heat_number` (`heat_number`),
  KEY `idx_tc_number` (`tc_number`),
  CONSTRAINT `fk_heat_tc_inspection_request` FOREIGN KEY (`inspection_request_id`) REFERENCES `vendor_inspection_request` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_inspection_details`
--

DROP TABLE IF EXISTS `rm_inspection_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_inspection_details` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ic_id` bigint NOT NULL COMMENT 'Foreign key to inspection_calls.id',
  `item_description` text NOT NULL COMMENT 'Description of the item/product',
  `item_quantity` int NOT NULL COMMENT 'Quantity of items in the PO',
  `consignee_zonal_railway` varchar(255) DEFAULT NULL COMMENT 'Consignee/Zonal Railway information',
  `heat_numbers` text NOT NULL COMMENT 'Comma-separated heat numbers',
  `tc_number` varchar(100) NOT NULL COMMENT 'Test Certificate Number',
  `tc_date` date DEFAULT NULL COMMENT 'Test Certificate Date',
  `tc_quantity` decimal(10,3) DEFAULT NULL COMMENT 'Quantity mentioned in TC (in MT)',
  `manufacturer` varchar(255) DEFAULT NULL COMMENT 'Manufacturer name',
  `supplier_name` varchar(255) DEFAULT NULL COMMENT 'Supplier name',
  `supplier_address` text COMMENT 'Supplier address',
  `invoice_number` varchar(100) DEFAULT NULL COMMENT 'Invoice number',
  `invoice_date` date DEFAULT NULL COMMENT 'Invoice date',
  `sub_po_number` varchar(100) DEFAULT NULL COMMENT 'Sub PO number',
  `sub_po_date` date DEFAULT NULL COMMENT 'Sub PO date',
  `sub_po_qty` int DEFAULT NULL COMMENT 'Sub PO quantity',
  `total_offered_qty_mt` decimal(10,3) NOT NULL COMMENT 'Total quantity offered for inspection (in MT)',
  `offered_qty_erc` int NOT NULL COMMENT 'Quantity offered in ERCs/pieces',
  `unit_of_measurement` varchar(20) NOT NULL DEFAULT 'MT' COMMENT 'Unit of measurement',
  `rate_of_material` decimal(10,2) DEFAULT NULL COMMENT 'Rate of material per unit',
  `rate_of_gst` decimal(5,2) DEFAULT NULL COMMENT 'GST rate percentage',
  `base_value_po` decimal(15,2) DEFAULT NULL COMMENT 'Base value of PO',
  `total_po` decimal(15,2) DEFAULT NULL COMMENT 'Total PO value including GST',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ic_id` (`ic_id`),
  KEY `idx_ic_id` (`ic_id`),
  KEY `idx_tc_number` (`tc_number`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_invoice_number` (`invoice_number`),
  CONSTRAINT `rm_inspection_details_ibfk_1` FOREIGN KEY (`ic_id`) REFERENCES `inspection_calls` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_inspection_summary`
--

DROP TABLE IF EXISTS `rm_inspection_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_inspection_summary` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `finished_at` datetime(6) DEFAULT NULL,
  `finished_by` varchar(100) DEFAULT NULL,
  `inspection_call_no` varchar(50) NOT NULL,
  `inspection_date` date DEFAULT NULL,
  `number_of_bundles` int DEFAULT NULL,
  `number_of_erc` int DEFAULT NULL,
  `place_of_inspection` varchar(200) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `po_no` varchar(50) DEFAULT NULL,
  `product_model` varchar(20) DEFAULT NULL,
  `shift_of_inspection` varchar(20) DEFAULT NULL,
  `source_of_raw_material` varchar(100) DEFAULT NULL,
  `total_heats_offered` int DEFAULT NULL,
  `total_qty_offered_mt` decimal(12,4) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `vendor_name` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK4ppiqwrtm6fi44li0oj88ftty` (`inspection_call_no`),
  KEY `idx_rm_summary_call_no` (`inspection_call_no`),
  KEY `idx_rm_summary_po_no` (`po_no`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_material_testing`
--

DROP TABLE IF EXISTS `rm_material_testing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_material_testing` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `carbon_percent` decimal(6,4) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `decarb` decimal(8,4) DEFAULT NULL,
  `grain_size` decimal(8,2) DEFAULT NULL,
  `hardness` decimal(8,2) DEFAULT NULL,
  `heat_index` int DEFAULT NULL,
  `heat_no` varchar(50) NOT NULL,
  `inclusion_a` decimal(8,2) DEFAULT NULL,
  `inclusion_b` decimal(8,2) DEFAULT NULL,
  `inclusion_c` decimal(8,2) DEFAULT NULL,
  `inclusion_d` decimal(8,2) DEFAULT NULL,
  `inspection_call_no` varchar(50) NOT NULL,
  `manganese_percent` decimal(6,4) DEFAULT NULL,
  `phosphorus_percent` decimal(6,4) DEFAULT NULL,
  `remarks` text,
  `sample_number` int NOT NULL,
  `silicon_percent` decimal(6,4) DEFAULT NULL,
  `sulphur_percent` decimal(6,4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rm_mat_call_no` (`inspection_call_no`),
  KEY `idx_rm_mat_heat_no` (`heat_no`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_packing_storage`
--

DROP TABLE IF EXISTS `rm_packing_storage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_packing_storage` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bundling_secure` varchar(10) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `inspection_call_no` varchar(50) NOT NULL,
  `heat_no` varchar(50) DEFAULT NULL,
  `heat_index` int DEFAULT NULL,
  `labels_correct` varchar(10) DEFAULT NULL,
  `moisture_protection` varchar(10) DEFAULT NULL,
  `protection_adequate` varchar(10) DEFAULT NULL,
  `remarks` text,
  `stacking_proper` varchar(10) DEFAULT NULL,
  `storage_condition` varchar(10) DEFAULT NULL,
  `tags_attached` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKak8lqc5oluh78gq2rdeiwrxiy` (`inspection_call_no`),
  KEY `idx_rm_pack_call_no` (`inspection_call_no`),
  KEY `idx_rm_pack_heat_no` (`heat_no`),
  KEY `idx_rm_pack_call_heat` (`inspection_call_no`,`heat_no`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rm_visual_inspection`
--

DROP TABLE IF EXISTS `rm_visual_inspection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rm_visual_inspection` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `defect_length_mm` decimal(10,2) DEFAULT NULL,
  `defect_name` varchar(100) NOT NULL,
  `heat_index` int DEFAULT NULL,
  `heat_no` varchar(50) NOT NULL,
  `inspection_call_no` varchar(50) NOT NULL,
  `is_selected` bit(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rm_visual_call_no` (`inspection_call_no`),
  KEY `idx_rm_visual_heat_no` (`heat_no`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `role_master`
--

DROP TABLE IF EXISTS `role_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_master` (
  `roleid` int NOT NULL AUTO_INCREMENT,
  `createdby` varchar(255) DEFAULT NULL,
  `createddate` datetime(6) DEFAULT NULL,
  `rolename` varchar(255) NOT NULL,
  PRIMARY KEY (`roleid`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sub_po_details`
--

DROP TABLE IF EXISTS `sub_po_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_po_details` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `inspection_call_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `raw_material_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade_spec` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `heat_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manufacturer_steel_bars` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tc_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tc_date` date DEFAULT NULL,
  `sub_po_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sub_po_date` date DEFAULT NULL,
  `invoice_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `sub_po_qty` decimal(15,3) DEFAULT NULL,
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place_of_inspection` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `rejection_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `inspection_call_details_id` bigint DEFAULT NULL,
  `created_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_date` datetime NOT NULL,
  `updated_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sub_po_call_no` (`inspection_call_no`),
  KEY `idx_sub_po_sub_po_no` (`sub_po_no`),
  KEY `idx_sub_po_heat_no` (`heat_no`),
  KEY `fk_sub_po_call_details` (`inspection_call_details_id`),
  CONSTRAINT `fk_sub_po_call_details` FOREIGN KEY (`inspection_call_details_id`) REFERENCES `inspection_call_details` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transition_condition_master`
--

DROP TABLE IF EXISTS `transition_condition_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transition_condition_master` (
  `conditionId` int NOT NULL AUTO_INCREMENT,
  `workflowId` int NOT NULL,
  `conditionKey` varchar(255) NOT NULL,
  `conditionValue` varchar(255) NOT NULL,
  `createdDate` datetime DEFAULT NULL,
  `createdBy` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`conditionId`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transition_master`
--

DROP TABLE IF EXISTS `transition_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transition_master` (
  `TRANSITIONID` int NOT NULL AUTO_INCREMENT,
  `TRANSITIONNAME` varchar(100) NOT NULL,
  `WORKFLOWID` int NOT NULL,
  `CURRENTROLEID` int NOT NULL,
  `NEXTROLEID` int DEFAULT NULL,
  `TRANSITIONORDER` int DEFAULT NULL,
  `CREATEDBY` varchar(50) DEFAULT NULL,
  `CREATEDDATE` datetime DEFAULT NULL,
  `condition_id` int DEFAULT NULL,
  `CURRENT_ACTION` varchar(100) DEFAULT NULL,
  `NEXT_ACTION` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`TRANSITIONID`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_master`
--

DROP TABLE IF EXISTS `user_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_master` (
  `userid` int NOT NULL AUTO_INCREMENT,
  `createdby` varchar(255) DEFAULT NULL,
  `createddate` datetime(6) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `employee_id` varchar(255) DEFAULT NULL,
  `mobilenumber` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role_name` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `EMPLOYEE_CODE` varchar(50) DEFAULT NULL,
  `RITES_EMPLOYEE_CODE` int DEFAULT NULL,
  `EMPLOYMENT_TYPE` varchar(20) DEFAULT NULL,
  `FULL_NAME` varchar(255) DEFAULT NULL,
  `SHORT_NAME` varchar(100) DEFAULT NULL,
  `DATE_OF_BIRTH` date DEFAULT NULL,
  `DESIGNATION` varchar(100) DEFAULT NULL,
  `DISCIPLINE` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`userid`),
  UNIQUE KEY `SHORT_NAME` (`SHORT_NAME`),
  KEY `idx_user_master_employee_code` (`EMPLOYEE_CODE`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_role_master`
--

DROP TABLE IF EXISTS `user_role_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_role_master` (
  `userroleid` int NOT NULL AUTO_INCREMENT,
  `createdby` varchar(255) DEFAULT NULL,
  `createddate` datetime(6) DEFAULT NULL,
  `readpermission` bit(1) DEFAULT NULL,
  `roleid` int NOT NULL,
  `userid` int NOT NULL,
  `writepermission` bit(1) DEFAULT NULL,
  PRIMARY KEY (`userroleid`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('customer','vendor','admin') NOT NULL DEFAULT 'customer',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle`
--

DROP TABLE IF EXISTS `vehicle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle` (
  `VehicleID` int NOT NULL AUTO_INCREMENT,
  `VehicleRegistrationNo` varchar(20) NOT NULL,
  `VehicleCode` varchar(100) NOT NULL,
  `VehicleChasisNo` varchar(50) NOT NULL,
  `VehicleModel` varchar(100) NOT NULL,
  `TypeOfBody` enum('Open','CBD','Container') DEFAULT 'Open',
  `VehicleType` varchar(50) DEFAULT NULL,
  `VehicleRegistrationDate` date DEFAULT NULL,
  `VehicleAge` int DEFAULT NULL,
  `VehicleKMS` decimal(10,2) DEFAULT NULL,
  `VendorID` int DEFAULT NULL,
  `DriverID` int DEFAULT NULL,
  `GPS` tinyint(1) DEFAULT '0',
  `GPSCompany` varchar(255) DEFAULT NULL,
  `NoEntryPass` enum('Yes','No') DEFAULT 'No',
  `NoEntryPassStartDate` date DEFAULT NULL,
  `NoEntryPassExpiry` date DEFAULT NULL,
  `LastServicing` date DEFAULT NULL,
  `RCUpload` varchar(512) DEFAULT NULL,
  `VehicleKMSPhoto` varchar(512) DEFAULT NULL,
  `VehiclePhoto` varchar(512) DEFAULT NULL,
  `VehiclePhotoFront` varchar(512) DEFAULT NULL,
  `VehiclePhotoBack` varchar(512) DEFAULT NULL,
  `VehiclePhotoLeftSide` varchar(512) DEFAULT NULL,
  `VehiclePhotoRightSide` varchar(512) DEFAULT NULL,
  `VehiclePhotoInterior` varchar(512) DEFAULT NULL,
  `VehiclePhotoEngine` varchar(512) DEFAULT NULL,
  `VehiclePhotoRoof` varchar(512) DEFAULT NULL,
  `VehiclePhotoDoor` varchar(512) DEFAULT NULL,
  `ServiceBillPhoto` varchar(512) DEFAULT NULL,
  `InsuranceCopy` varchar(512) DEFAULT NULL,
  `FitnessCertificateUpload` varchar(512) DEFAULT NULL,
  `PollutionPhoto` varchar(512) DEFAULT NULL,
  `StateTaxPhoto` varchar(512) DEFAULT NULL,
  `NoEntryPassCopy` varchar(512) DEFAULT NULL,
  `InsuranceInfo` text,
  `VehicleInsuranceCompany` varchar(255) DEFAULT NULL,
  `VehicleInsuranceDate` date DEFAULT NULL,
  `InsuranceExpiry` date DEFAULT NULL,
  `VehicleFitnessCertificateIssue` date DEFAULT NULL,
  `FitnessExpiry` date DEFAULT NULL,
  `VehiclePollutionDate` date DEFAULT NULL,
  `PollutionExpiry` date DEFAULT NULL,
  `StateTaxIssue` date DEFAULT NULL,
  `StateTaxExpiry` date DEFAULT NULL,
  `VehicleLoadingCapacity` decimal(10,2) DEFAULT NULL,
  `Status` enum('Active','Maintenance','Inactive') DEFAULT 'Active',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`VehicleID`),
  UNIQUE KEY `VehicleRegistrationNo` (`VehicleRegistrationNo`),
  UNIQUE KEY `VehicleCode` (`VehicleCode`),
  UNIQUE KEY `VehicleChasisNo` (`VehicleChasisNo`),
  KEY `VendorID` (`VendorID`),
  KEY `idx_vehicle_status` (`Status`),
  CONSTRAINT `vehicle_ibfk_1` FOREIGN KEY (`VendorID`) REFERENCES `vendor` (`VendorID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_freight`
--

DROP TABLE IF EXISTS `vehicle_freight`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_freight` (
  `VehicleFreightID` int NOT NULL AUTO_INCREMENT,
  `VehicleID` int NOT NULL,
  `FixRate` decimal(10,2) DEFAULT NULL,
  `FuelRate` decimal(10,2) DEFAULT NULL,
  `HandlingCharges` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`VehicleFreightID`),
  KEY `VehicleID` (`VehicleID`),
  CONSTRAINT `vehicle_freight_ibfk_1` FOREIGN KEY (`VehicleID`) REFERENCES `vehicle` (`VehicleID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicle_project_assignments`
--

DROP TABLE IF EXISTS `vehicle_project_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_project_assignments` (
  `assignment_id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `project_id` int NOT NULL,
  `driver_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `vendor_id` int DEFAULT NULL,
  `placement_type` varchar(50) DEFAULT 'Fixed',
  `assigned_by` varchar(100) DEFAULT 'System',
  `assignment_notes` text,
  `status` varchar(20) DEFAULT 'active',
  `assigned_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`assignment_id`),
  KEY `customer_id` (`customer_id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `idx_vehicle_id` (`vehicle_id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_driver_id` (`driver_id`),
  KEY `idx_status` (`status`),
  KEY `idx_assigned_date` (`assigned_date`),
  CONSTRAINT `vehicle_project_assignments_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`VehicleID`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_project_assignments_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `project` (`ProjectID`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_project_assignments_ibfk_3` FOREIGN KEY (`driver_id`) REFERENCES `driver` (`DriverID`) ON DELETE CASCADE,
  CONSTRAINT `vehicle_project_assignments_ibfk_4` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`CustomerID`) ON DELETE SET NULL,
  CONSTRAINT `vehicle_project_assignments_ibfk_5` FOREIGN KEY (`vendor_id`) REFERENCES `vendor` (`VendorID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vehicletransaction`
--

DROP TABLE IF EXISTS `vehicletransaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicletransaction` (
  `TransactionID` int NOT NULL AUTO_INCREMENT,
  `TripType` enum('Fixed','Adhoc','Replacement') NOT NULL,
  `TransactionDate` date NOT NULL,
  `Shift` varchar(50) DEFAULT NULL,
  `VehicleID` int NOT NULL,
  `DriverID` int NOT NULL,
  `ReplacementDriverID` int DEFAULT NULL,
  `VendorID` int DEFAULT NULL,
  `CustomerID` int NOT NULL,
  `ProjectID` int DEFAULT NULL,
  `LocationID` int DEFAULT NULL,
  `ArrivalTimeAtHub` time DEFAULT NULL,
  `OpeningKM` decimal(10,2) DEFAULT NULL,
  `ClosingKM` decimal(10,2) DEFAULT NULL,
  `TotalKM` decimal(10,2) GENERATED ALWAYS AS ((`ClosingKM` - `OpeningKM`)) STORED,
  `FreightFix` decimal(15,2) DEFAULT NULL,
  `DeliveriesDone` int DEFAULT NULL,
  `TripNo` varchar(50) DEFAULT NULL,
  `FreightVariable` decimal(15,2) DEFAULT NULL,
  `AdvancePaid` decimal(15,2) DEFAULT NULL,
  `BalancePaid` decimal(15,2) DEFAULT NULL,
  `LoadingPoint` varchar(255) DEFAULT NULL,
  `UnloadingPoint` varchar(255) DEFAULT NULL,
  `MaterialType` varchar(255) DEFAULT NULL,
  `Remarks` text,
  `TotalFreight` decimal(15,2) GENERATED ALWAYS AS ((coalesce(`FreightFix`,0) + coalesce(`FreightVariable`,0))) STORED,
  `Status` enum('Pending','In Progress','Completed','Cancelled') DEFAULT 'Pending',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `InTimeByCust` time DEFAULT NULL,
  `OutTimeFromHub` time DEFAULT NULL,
  `ReturnReportingTime` time DEFAULT NULL,
  `TotalDeliveries` int DEFAULT NULL,
  `TotalDeliveriesAttempted` int DEFAULT NULL,
  `TotalDeliveriesDone` int DEFAULT NULL,
  `TotalDutyHours` decimal(5,2) DEFAULT NULL,
  `VehicleNumber` varchar(50) DEFAULT NULL COMMENT 'Manual vehicle number entry for Adhoc/Replacement',
  `VendorName` varchar(255) DEFAULT NULL COMMENT 'Manual vendor name entry for Adhoc/Replacement',
  `VendorNumber` varchar(10) DEFAULT NULL COMMENT 'Manual vendor mobile number for Adhoc/Replacement',
  `DriverName` varchar(255) DEFAULT NULL COMMENT 'Manual driver name entry for Adhoc/Replacement',
  `DriverNumber` varchar(10) DEFAULT NULL COMMENT 'Manual driver mobile number for Adhoc/Replacement',
  `DriverAadharNumber` varchar(12) DEFAULT NULL COMMENT 'Driver Aadhar number for Adhoc/Replacement',
  `DriverAadharDoc` varchar(500) DEFAULT NULL COMMENT 'Driver Aadhar document file path',
  `DriverLicenceNumber` varchar(50) DEFAULT NULL COMMENT 'Driver licence number for Adhoc/Replacement',
  `DriverLicenceDoc` varchar(500) DEFAULT NULL COMMENT 'Driver licence document file path',
  `TotalShipmentsForDeliveries` int DEFAULT NULL COMMENT 'Total shipments for deliveries',
  `TotalShipmentDeliveriesAttempted` int DEFAULT NULL COMMENT 'Total shipment deliveries attempted',
  `TotalShipmentDeliveriesDone` int DEFAULT NULL COMMENT 'Total shipment deliveries completed',
  `VFreightFix` decimal(15,2) DEFAULT NULL COMMENT 'V.Freight (Fix) amount',
  `FixKm` decimal(10,2) DEFAULT NULL COMMENT 'Fix KM if any',
  `VFreightVariable` decimal(15,2) DEFAULT NULL COMMENT 'V.Freight (Variable - Per KM)',
  `TollExpenses` decimal(15,2) DEFAULT NULL COMMENT 'Toll expenses amount',
  `TollExpensesDoc` varchar(500) DEFAULT NULL COMMENT 'Toll expenses document file path',
  `ParkingCharges` decimal(15,2) DEFAULT NULL COMMENT 'Parking charges amount',
  `ParkingChargesDoc` varchar(500) DEFAULT NULL COMMENT 'Parking charges document file path',
  `LoadingCharges` decimal(15,2) DEFAULT NULL COMMENT 'Loading charges amount',
  `UnloadingCharges` decimal(15,2) DEFAULT NULL COMMENT 'Unloading charges amount',
  `OtherCharges` decimal(15,2) DEFAULT NULL COMMENT 'Other charges if any',
  `OtherChargesRemarks` text COMMENT 'Remarks for other charges',
  `OutTimeFrom` time DEFAULT NULL COMMENT 'Out time from location',
  `TotalFreightCalculated` decimal(15,2) DEFAULT NULL COMMENT 'Auto-calculated total freight',
  `AdvanceRequestNo` varchar(100) DEFAULT NULL COMMENT 'Advance request number',
  `AdvanceToPaid` decimal(15,2) DEFAULT NULL COMMENT 'Advance amount to be paid',
  `AdvanceApprovedAmount` decimal(15,2) DEFAULT NULL COMMENT 'Advance approved amount',
  `AdvanceApprovedBy` varchar(255) DEFAULT NULL COMMENT 'Advance approved by person',
  `AdvancePaidAmount` decimal(15,2) DEFAULT NULL COMMENT 'Advance paid amount',
  `AdvancePaidMode` enum('UPI','Bank Transfer') DEFAULT NULL COMMENT 'Advance payment mode',
  `AdvancePaidDate` date DEFAULT NULL COMMENT 'Advance payment date',
  `AdvancePaidBy` varchar(255) DEFAULT NULL COMMENT 'Advance paid by person',
  `EmployeeDetailsAdvance` text COMMENT 'Employee details if advance paid by employee',
  `BalanceToBePaid` decimal(15,2) DEFAULT NULL COMMENT 'Balance amount to be paid (calculated)',
  `BalancePaidAmount` decimal(15,2) DEFAULT NULL COMMENT 'Balance paid amount',
  `Variance` decimal(15,2) DEFAULT NULL COMMENT 'Variance if any (calculated)',
  `BalancePaidDate` date DEFAULT NULL COMMENT 'Balance payment date',
  `BalancePaidBy` varchar(255) DEFAULT NULL COMMENT 'Balance paid by person',
  `EmployeeDetailsBalance` text COMMENT 'Employee details if balance paid by employee',
  `Revenue` decimal(15,2) DEFAULT NULL COMMENT 'Revenue (calculated)',
  `Margin` decimal(15,2) DEFAULT NULL COMMENT 'Margin (calculated)',
  `MarginPercentage` decimal(5,2) DEFAULT NULL COMMENT 'Margin percentage (calculated)',
  `TripClose` tinyint(1) DEFAULT '0' COMMENT 'Trip close status',
  `ReplacementDriverName` varchar(255) DEFAULT NULL COMMENT 'Manual replacement driver name',
  `ReplacementDriverNo` varchar(10) DEFAULT NULL COMMENT 'Manual replacement driver number',
  PRIMARY KEY (`TransactionID`),
  KEY `idx_transaction_date` (`TransactionDate`),
  KEY `idx_trip_type` (`TripType`),
  KEY `idx_vehicle_id` (`VehicleID`),
  KEY `idx_driver_id` (`DriverID`),
  KEY `idx_vendor_id` (`VendorID`),
  KEY `idx_customer_id` (`CustomerID`),
  KEY `idx_project_id` (`ProjectID`),
  KEY `idx_location_id` (`LocationID`),
  KEY `vehicletransaction_ibfk_8` (`ReplacementDriverID`),
  KEY `idx_trip_type_date` (`TripType`,`TransactionDate`),
  KEY `idx_vehicle_number` (`VehicleNumber`),
  KEY `idx_driver_number` (`DriverNumber`),
  KEY `idx_vendor_number` (`VendorNumber`),
  KEY `idx_trip_close` (`TripClose`),
  KEY `idx_advance_paid_date` (`AdvancePaidDate`),
  KEY `idx_balance_paid_date` (`BalancePaidDate`),
  CONSTRAINT `vehicletransaction_ibfk_1` FOREIGN KEY (`VehicleID`) REFERENCES `vehicle` (`VehicleID`) ON DELETE CASCADE,
  CONSTRAINT `vehicletransaction_ibfk_2` FOREIGN KEY (`DriverID`) REFERENCES `driver` (`DriverID`) ON DELETE CASCADE,
  CONSTRAINT `vehicletransaction_ibfk_3` FOREIGN KEY (`VendorID`) REFERENCES `vendor` (`VendorID`) ON DELETE CASCADE,
  CONSTRAINT `vehicletransaction_ibfk_4` FOREIGN KEY (`CustomerID`) REFERENCES `customer` (`CustomerID`) ON DELETE CASCADE,
  CONSTRAINT `vehicletransaction_ibfk_5` FOREIGN KEY (`ProjectID`) REFERENCES `project` (`ProjectID`) ON DELETE SET NULL,
  CONSTRAINT `vehicletransaction_ibfk_6` FOREIGN KEY (`LocationID`) REFERENCES `location` (`LocationID`) ON DELETE SET NULL,
  CONSTRAINT `vehicletransaction_ibfk_7` FOREIGN KEY (`ReplacementDriverID`) REFERENCES `driver` (`DriverID`),
  CONSTRAINT `vehicletransaction_ibfk_8` FOREIGN KEY (`ReplacementDriverID`) REFERENCES `driver` (`DriverID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor`
--

DROP TABLE IF EXISTS `vendor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor` (
  `VendorID` int NOT NULL AUTO_INCREMENT,
  `VendorName` varchar(255) NOT NULL,
  `VendorCode` varchar(100) NOT NULL,
  `VendorMobileNo` varchar(15) NOT NULL,
  `VendorAddress` text NOT NULL,
  `HouseFlatNo` varchar(100) DEFAULT NULL,
  `StreetLocality` varchar(255) DEFAULT NULL,
  `City` varchar(100) DEFAULT NULL,
  `State` varchar(100) DEFAULT NULL,
  `PinCode` varchar(6) DEFAULT NULL,
  `Country` varchar(100) DEFAULT 'India',
  `VendorAlternateNo` varchar(20) DEFAULT NULL,
  `TypeOfCompany` varchar(100) NOT NULL,
  `CompanyName` varchar(255) DEFAULT NULL,
  `CompanyGST` varchar(20) DEFAULT NULL,
  `VendorCompanyUdhyam` varchar(50) DEFAULT NULL,
  `VendorCompanyPAN` varchar(10) DEFAULT NULL,
  `StartDateOfCompany` date DEFAULT NULL,
  `AddressOfCompany` text,
  `VendorAadhar` varchar(12) DEFAULT NULL,
  `VendorPAN` varchar(10) DEFAULT NULL,
  `BankDetails` text,
  `AccountHolderName` varchar(100) DEFAULT NULL,
  `AccountNumber` varchar(20) DEFAULT NULL,
  `IFSCCode` varchar(11) DEFAULT NULL,
  `BankName` varchar(100) DEFAULT NULL,
  `BranchName` varchar(100) DEFAULT NULL,
  `BranchAddress` text,
  `BankCity` varchar(50) DEFAULT NULL,
  `BankState` varchar(50) DEFAULT NULL,
  `VendorPhoto` varchar(512) DEFAULT NULL,
  `VendorAadharDoc` varchar(512) DEFAULT NULL,
  `VendorPANDoc` varchar(512) DEFAULT NULL,
  `VendorCompanyUdhyamDoc` varchar(512) DEFAULT NULL,
  `VendorCompanyPANDoc` varchar(512) DEFAULT NULL,
  `VendorCompanyGSTDoc` varchar(512) DEFAULT NULL,
  `CompanyLegalDocs` varchar(512) DEFAULT NULL,
  `BankChequeUpload` varchar(512) DEFAULT NULL,
  `Status` varchar(20) DEFAULT 'active',
  `CreatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `project_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  PRIMARY KEY (`VendorID`),
  UNIQUE KEY `VendorCode` (`VendorCode`),
  KEY `idx_vendor_mobile` (`VendorMobileNo`),
  KEY `project_id` (`project_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `vendor_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `project` (`ProjectID`),
  CONSTRAINT `vendor_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`CustomerID`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_inspection_request`
--

DROP TABLE IF EXISTS `vendor_inspection_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_inspection_request` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `amendment_date` date DEFAULT NULL,
  `amendment_no` varchar(50) DEFAULT NULL,
  `cin` varchar(50) DEFAULT NULL,
  `company_id` int DEFAULT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `desired_inspection_date` date DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `po_description` varchar(255) DEFAULT NULL,
  `po_no` varchar(50) NOT NULL,
  `po_qty` int DEFAULT NULL,
  `po_serial_no` varchar(50) DEFAULT NULL,
  `po_unit` varchar(20) DEFAULT NULL,
  `qty_already_inspected_final` int DEFAULT NULL,
  `qty_already_inspected_process` int DEFAULT NULL,
  `qty_already_inspected_rm` int DEFAULT NULL,
  `remarks` text,
  `rm_chemical_carbon` decimal(6,4) DEFAULT NULL,
  `rm_chemical_chromium` decimal(6,4) DEFAULT NULL,
  `rm_chemical_manganese` decimal(6,4) DEFAULT NULL,
  `rm_chemical_phosphorus` decimal(6,4) DEFAULT NULL,
  `rm_chemical_silicon` decimal(6,4) DEFAULT NULL,
  `rm_chemical_sulphur` decimal(6,4) DEFAULT NULL,
  `rm_heat_numbers` varchar(500) DEFAULT NULL,
  `rm_offered_qty_erc` int DEFAULT NULL,
  `rm_total_offered_qty_mt` decimal(10,3) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `type_of_call` varchar(50) DEFAULT NULL,
  `unit_address` varchar(500) DEFAULT NULL,
  `unit_contact_person` varchar(100) DEFAULT NULL,
  `unit_gstin` varchar(20) DEFAULT NULL,
  `unit_id` int DEFAULT NULL,
  `unit_name` varchar(100) DEFAULT NULL,
  `unit_role` varchar(50) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `vendor_contact_name` varchar(100) DEFAULT NULL,
  `vendor_contact_phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_po_no` (`po_no`),
  KEY `idx_po_serial_no` (`po_serial_no`),
  KEY `idx_type_of_call` (`type_of_call`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_master`
--

DROP TABLE IF EXISTS `vendor_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_master` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `vendor_code` varchar(100) NOT NULL,
  `vendor_name` varchar(255) DEFAULT NULL,
  `vendor_details` text,
  `created_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_code` (`vendor_code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_master`
--

DROP TABLE IF EXISTS `workflow_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_master` (
  `WORKFLOWID` int NOT NULL AUTO_INCREMENT,
  `WORKFLOWNAME` varchar(150) NOT NULL,
  `CREATEDBY` varchar(50) DEFAULT NULL,
  `CREATEDDATE` datetime DEFAULT NULL,
  PRIMARY KEY (`WORKFLOWID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workflow_transition`
--

DROP TABLE IF EXISTS `workflow_transition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_transition` (
  `WORKFLOWTRANSITIONID` int NOT NULL AUTO_INCREMENT,
  `WORKFLOWID` int NOT NULL,
  `TRANSITIONID` int NOT NULL,
  `REQUESTID` varchar(100) NOT NULL,
  `CURRENTROLE` varchar(100) DEFAULT NULL,
  `NEXTROLE` varchar(100) DEFAULT NULL,
  `STATUS` varchar(50) DEFAULT NULL,
  `ACTION` varchar(50) DEFAULT NULL,
  `REMARKS` varchar(500) DEFAULT NULL,
  `CREATEDBY` int DEFAULT NULL,
  `CREATEDDATE` datetime DEFAULT NULL,
  `assigned_to_user` int DEFAULT NULL,
  `current_role_Name` varchar(50) DEFAULT NULL,
  `next_role_Name` varchar(50) DEFAULT NULL,
  `job_status` varchar(200) DEFAULT NULL,
  `process_ie_user_id` int DEFAULT NULL,
  `WORKFLOWSEQUENCE` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  `rio` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`WORKFLOWTRANSITIONID`)
) ENGINE=InnoDB AUTO_INCREMENT=427 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `active_ifsc_cache`
--

/*!50001 DROP VIEW IF EXISTS `active_ifsc_cache`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `active_ifsc_cache` AS select `ifsc_cache`.`ifsc_code` AS `ifsc_code`,`ifsc_cache`.`bank_name` AS `bank_name`,`ifsc_cache`.`branch_name` AS `branch_name`,`ifsc_cache`.`branch_address` AS `branch_address`,`ifsc_cache`.`city` AS `city`,`ifsc_cache`.`state` AS `state`,`ifsc_cache`.`district` AS `district`,`ifsc_cache`.`contact_number` AS `contact_number`,`ifsc_cache`.`micr_code` AS `micr_code`,`ifsc_cache`.`swift_code` AS `swift_code`,`ifsc_cache`.`cached_at` AS `cached_at`,`ifsc_cache`.`data_source` AS `data_source` from `ifsc_cache` where (`ifsc_cache`.`is_active` = true) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-21 12:53:55
