-- ============================================================
-- SwiftWheels Enterprises - PMS Database
-- ============================================================

CREATE DATABASE IF NOT EXISTS PMS CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE PMS;

-- ============================================================
-- Table: Users
-- ============================================================
CREATE TABLE IF NOT EXISTS Users (
    UserID      INT AUTO_INCREMENT PRIMARY KEY,
    UserName    VARCHAR(100) NOT NULL UNIQUE,
    Password    VARCHAR(255) NOT NULL,
    Role        ENUM('Admin','Manager','Staff') NOT NULL DEFAULT 'Staff',
    CreatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: Vehicle
-- ============================================================
CREATE TABLE IF NOT EXISTS Vehicle (
    Plate_Number   VARCHAR(20)   PRIMARY KEY,
    Brand          VARCHAR(100)  NOT NULL,
    Model          VARCHAR(100)  NOT NULL,
    Year           YEAR          NOT NULL,
    Vehicle_Type   ENUM('Sedan','SUV','Truck','Van','Motorcycle','Bus','Other') NOT NULL,
    Purchase_Price DECIMAL(12,2) NOT NULL,
    Status         ENUM('Available','Rented','Sold','Under Maintenance') NOT NULL DEFAULT 'Available',
    RegisteredBy   INT,
    CreatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_user FOREIGN KEY (RegisteredBy) REFERENCES Users(UserID)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================================
-- Table: Customer
-- ============================================================
CREATE TABLE IF NOT EXISTS Customer (
    CustomerID   INT AUTO_INCREMENT PRIMARY KEY,
    FirstName    VARCHAR(100) NOT NULL,
    LastName     VARCHAR(100) NOT NULL,
    Email        VARCHAR(150) NOT NULL UNIQUE,
    PhoneNumber  VARCHAR(20)  NOT NULL,
    Status       ENUM('Active','Inactive','Blocked') NOT NULL DEFAULT 'Active',
    RegisteredBy INT,
    CreatedAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_user FOREIGN KEY (RegisteredBy) REFERENCES Users(UserID)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================================
-- Table: Promotion
-- ============================================================
CREATE TABLE IF NOT EXISTS Promotion (
    PromotionID    INT AUTO_INCREMENT PRIMARY KEY,
    Title          VARCHAR(200) NOT NULL,
    Description    TEXT,
    Discount_Type  ENUM('Free','Percentage','Flat Rate','Cashback','Buy-One-Get-One','Bundle') NOT NULL,
    Discount_Value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Start_Date     DATE NOT NULL,
    End_Date       DATE NOT NULL,
    Status         ENUM('Active','Inactive','Expired') NOT NULL DEFAULT 'Active',
    CreatedBy      INT,
    CreatedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_promotion_user FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_dates CHECK (End_Date >= Start_Date)
);

-- ============================================================
-- Table: Promotion_Vehicle  (junction / bridge table  M:N)
-- ============================================================
CREATE TABLE IF NOT EXISTS Promotion_Vehicle (
    PromoVehicleID INT AUTO_INCREMENT PRIMARY KEY,
    PromotionID    INT         NOT NULL,
    Plate_Number   VARCHAR(20) NOT NULL,
    Performance    VARCHAR(255),
    AssignedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pv_promotion FOREIGN KEY (PromotionID)
        REFERENCES Promotion(PromotionID) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pv_vehicle FOREIGN KEY (Plate_Number)
        REFERENCES Vehicle(Plate_Number) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_pv UNIQUE (PromotionID, Plate_Number)
);
