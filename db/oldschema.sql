-- =========================================
-- Tables
-- =========================================

-- Brands
CREATE TABLE dbo.brands (
    Brand_Id     INT           NOT NULL PRIMARY KEY,
    Name         NVARCHAR(150) NOT NULL
);
GO

-- Categories
CREATE TABLE dbo.categories (
    Category_Id  INT            NOT NULL PRIMARY KEY,
    Name         NVARCHAR(200)  NOT NULL,
    [Order]      INT            NOT NULL
);
GO

-- Dimensions
CREATE TABLE dbo.dimensions (
    Dimension_Id INT           NOT NULL PRIMARY KEY,
    Name         NVARCHAR(120) NOT NULL
);
GO

CREATE TABLE dbo.units (
    Unit_Id INT           NOT NULL PRIMARY KEY,
    Name    NVARCHAR(100) NOT NULL
);

-- Products
CREATE TABLE dbo.products (
    Id               INT             NOT NULL PRIMARY KEY,
    Code             NVARCHAR(50)    NOT NULL,
    Name             NVARCHAR(255)   NOT NULL,
    Description      NVARCHAR(MAX)       NULL,
    Category_Id      INT                 NULL,
    Sub_Category_Id  INT                 NULL,
    Sub_Category2    INT                 NULL,
    Shelf_Id         INT                 NULL,
    Price            DECIMAL(18,2)   NOT NULL DEFAULT (0),
    Currency         NVARCHAR(10)        NULL,
    Dimension_Id     INT                 NULL,
    Dimension_Value  NVARCHAR(50)        NULL,
    Unit_Id          INT                 NULL,
    Unit_Value       DECIMAL(18,3)       NULL,
    Stock_Quantity   INT                 NULL,
    Stock_Unit       INT                 NULL,
    CreatedAt        DATETIME2(0)        NULL,
    UpdatedAt        DATETIME2(0)        NULL,
    ImagePath        NVARCHAR(260)       NULL,
    Brand_Id         INT                 NULL,
    IsActive         BIT             NOT NULL DEFAULT (1),
    Almacen_Id       INT                 NULL,

    CONSTRAINT FK_products_brands
        FOREIGN KEY (Brand_Id) REFERENCES dbo.brands(Brand_Id),

    CONSTRAINT FK_products_categories_main
        FOREIGN KEY (Category_Id) REFERENCES dbo.categories(Category_Id),

    CONSTRAINT FK_products_categories_sub1
        FOREIGN KEY (Sub_Category_Id) REFERENCES dbo.categories(Category_Id),

    CONSTRAINT FK_products_categories_sub2
        FOREIGN KEY (Sub_Category2) REFERENCES dbo.categories(Category_Id),

    CONSTRAINT FK_products_dimensions
        FOREIGN KEY (Dimension_Id) REFERENCES dbo.dimensions(Dimension_Id),

    CONSTRAINT FK_products_units_main
        FOREIGN KEY (Unit_Id) REFERENCES dbo.units(Unit_Id),

    CONSTRAINT FK_products_units_stock
        FOREIGN KEY (Stock_Unit) REFERENCES dbo.units(Unit_Id)
);
GO

-- =========================================
-- INSERT Snippets (no values, as requested)
-- =========================================

-- brands
INSERT INTO dbo.brands (Brand_Id, Name) VALUES
();
GO

-- categories
INSERT INTO dbo.categories (Category_Id, Name, [Order]) VALUES
();
GO

-- dimensions
INSERT INTO dbo.dimensions (Dimension_Id, Name) VALUES
();
GO

--Units
INSERT INTO dbo.units (Unit_Id, Name) VALUES
();
GO

-- products
INSERT INTO dbo.products (
    Id, Code, Name, Description, Category_Id, Sub_Category_Id, Sub_Category2,
    Shelf_Id, Price, Currency, Dimension_Id, Dimension_Value, Unit_Id,
    Unit_Value, Stock_Quantity, Stock_Unit, CreatedAt, UpdatedAt, ImagePath,
    Brand_Id, IsActive, Almacen_Id
) VALUES
());
GO

