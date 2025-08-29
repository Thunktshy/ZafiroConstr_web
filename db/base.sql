/*==============================================================
  BASE LIMPIA (sin auditoría ni triggers)
==============================================================*/
CREATE DATABASE Almacen;
GO
USE Almacen;
GO

/* ============================
   Tabla de LOG de errores
   ============================ */
DROP TABLE IF EXISTS logs;
GO
CREATE TABLE logs (
  log_id  INT IDENTITY(1,1) PRIMARY KEY,
  fecha   DATETIME      NOT NULL DEFAULT GETDATE(),
  origen  NVARCHAR(100) NOT NULL,
  mensaje NVARCHAR(MAX) NOT NULL,
  usuario NVARCHAR(128) NOT NULL DEFAULT SUSER_SNAME()
);
GO

/* ============================
   CAJAS
   ============================ */
DROP TABLE IF EXISTS cajas;
GO
CREATE TABLE cajas (
  caja_id INT IDENTITY(1,1) PRIMARY KEY,
  letra VARCHAR(2) NOT NULL
    CHECK (LEN(letra) BETWEEN 1 AND 2 AND letra COLLATE Latin1_General_CS_AS NOT LIKE '%[^A-Z]%'),
  cara  TINYINT NOT NULL CHECK (cara  IN (1,2)), -- 1=FRENTE, 2=ATRAS
  nivel TINYINT NOT NULL CHECK (nivel IN (1,2)), -- 1=ARRIBA, 2=ABAJO
  etiqueta AS (
    'caja ' + letra + ' ' +
    CASE cara  WHEN 1 THEN 'FRENTE' ELSE 'ATRAS' END + ' ' +
    CASE nivel WHEN 1 THEN 'ARRIBA' ELSE 'ABAJO' END
  ) PERSISTED,
  CONSTRAINT UQ_cajas_letra_cara_nivel UNIQUE (letra, cara, nivel)
);
GO

/* ============================
   CATEGORIAS
   ============================ */
DROP TABLE IF EXISTS categorias;
GO
CREATE TABLE categorias (
  categoria_id INT IDENTITY(1,1) PRIMARY KEY,
  nombre       NVARCHAR(100) UNIQUE NOT NULL,
  descripcion  NVARCHAR(255)
);
GO

/* ============================
   PRODUCTOS
   ============================ */
DROP TABLE IF EXISTS productos;
GO
CREATE TABLE productos (
  producto_id  INT IDENTITY(1,1) PRIMARY KEY,
  nombre       NVARCHAR(100) UNIQUE NOT NULL,
  descripcion  NVARCHAR(255),
  precio       DECIMAL(10,2) NOT NULL CONSTRAINT ck_productos_precio_nonneg CHECK (precio >= 0),
  estado       BIT NOT NULL CONSTRAINT df_productos_estado DEFAULT 1, -- 1=ACTIVO
  categoria_id INT NOT NULL,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(categoria_id)
);
GO

/* ============================
   CAJAS_DETALLES (Stock por caja/producto)
   ============================ */
DROP TABLE IF EXISTS cajas_detalles;
GO
CREATE TABLE cajas_detalles (
  detalle_id  INT IDENTITY(1,1) PRIMARY KEY,
  caja_id     INT NOT NULL,
  producto_id INT NOT NULL,
  stock       INT NOT NULL DEFAULT (0) CONSTRAINT ck_cajas_detalles_stock_nonneg CHECK (stock >= 0),
  CONSTRAINT fk_cajas_detalles_caja FOREIGN KEY (caja_id) REFERENCES cajas(caja_id),
  CONSTRAINT fk_cajas_detalles_prod FOREIGN KEY (producto_id) REFERENCES productos(producto_id),
  CONSTRAINT uq_cajas_detalles UNIQUE (caja_id, producto_id)
);
GO

/* ============================
   USUARIOS
   ============================ */
DROP TABLE IF EXISTS usuarios;
GO
CREATE TABLE usuarios (
  usuario_id     INT IDENTITY(1,1) PRIMARY KEY,
  nombre         NVARCHAR(100) NOT NULL UNIQUE,
  contrasena     NVARCHAR(255) NOT NULL,
  email          NVARCHAR(150) NOT NULL UNIQUE,
  fecha_registro DATETIME      NOT NULL DEFAULT GETDATE(),
  estado         BIT           NOT NULL DEFAULT 1 CHECK (estado IN (0,1)),
  tipo           NVARCHAR(10)  NOT NULL DEFAULT N'Usuario'
);
GO

/* ============================
   ÍNDICES
   ============================ */
-- cajas
CREATE INDEX IX_cajas_letra_cara_nivel ON cajas(letra, cara, nivel);
CREATE INDEX IX_cajas_etiqueta        ON cajas(etiqueta);
-- categorias
CREATE INDEX IX_categorias_nombre ON categorias(nombre);
-- productos
CREATE INDEX IX_productos_nombre       ON productos(nombre);
CREATE INDEX IX_productos_categoria_id ON productos(categoria_id);
CREATE INDEX IX_productos_estado       ON productos(estado) INCLUDE (nombre, precio, categoria_id);
CREATE INDEX IX_productos_precio       ON productos(precio) INCLUDE (nombre, estado, categoria_id);
-- cajas_detalles
CREATE INDEX IX_cajas_detalles_caja_id        ON cajas_detalles(caja_id);
CREATE INDEX IX_cajas_detalles_producto_id    ON cajas_detalles(producto_id);
CREATE INDEX IX_cajas_detalles_caja_producto  ON cajas_detalles(caja_id, producto_id) INCLUDE (stock);
CREATE INDEX IX_cajas_detalles_producto_caja  ON cajas_detalles(producto_id, caja_id) INCLUDE (stock);
CREATE INDEX IX_cajas_detalles_stock          ON cajas_detalles(stock) WHERE stock > 0;
-- logs (errores)
CREATE INDEX IX_logs_fecha   ON logs(fecha);
CREATE INDEX IX_logs_origen  ON logs(origen);
CREATE INDEX IX_logs_usuario ON logs(usuario);
GO

/* =========================================================
   PROCEDIMIENTOS: CAJAS
   ========================================================= */
CREATE OR ALTER PROCEDURE cajas_insert
  @letra VARCHAR(2),
  @cara  TINYINT,
  @nivel TINYINT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    SET @letra = UPPER(LTRIM(RTRIM(@letra)));
    IF @letra IS NULL OR LEN(@letra) NOT BETWEEN 1 AND 2
      THROW 52001, 'letra debe tener 1 o 2 caracteres.', 1;
    IF @cara NOT IN (1,2)  THROW 52002, 'cara inválida. Use 1=FRENTE, 2=ATRAS.', 1;
    IF @nivel NOT IN (1,2) THROW 52003, 'nivel inválido. Use 1=ARRIBA, 2=ABAJO.', 1;
    IF EXISTS (SELECT 1 FROM cajas WHERE letra=@letra AND cara=@cara AND nivel=@nivel)
      THROW 52004, 'Ya existe una caja con la misma letra, cara y nivel.', 1;
    INSERT INTO cajas (letra, cara, nivel) VALUES (@letra, @cara, @nivel);
    COMMIT;
    SELECT caja_id, letra, cara, nivel, etiqueta
    FROM cajas WHERE caja_id = SCOPE_IDENTITY();
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'cajas_insert', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE cajas_update
  @caja_id INT, @letra VARCHAR(2), @cara TINYINT, @nivel TINYINT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM cajas WHERE caja_id=@caja_id)
      THROW 52005, 'La caja ya no se encuentra en la base de datos.', 1;
    SET @letra = UPPER(LTRIM(RTRIM(@letra)));
    IF @letra IS NULL OR LEN(@letra) NOT BETWEEN 1 AND 2
      THROW 52006, 'letra debe tener 1 o 2 caracteres.', 1;
    IF @cara NOT IN (1,2)  THROW 52007, 'cara inválida. Use 1=FRENTE, 2=ATRAS.', 1;
    IF @nivel NOT IN (1,2) THROW 52008, 'nivel inválido. Use 1=ARRIBA, 2=ABAJO.', 1;
    IF EXISTS (
      SELECT 1 FROM cajas
      WHERE letra=@letra AND cara=@cara AND nivel=@nivel AND caja_id<>@caja_id
    ) THROW 52009, 'Otra caja ya usa esa combinación de letra, cara y nivel.', 1;
    UPDATE cajas SET letra=@letra, cara=@cara, nivel=@nivel WHERE caja_id=@caja_id;
    COMMIT;
    SELECT caja_id, letra, cara, nivel, etiqueta FROM cajas WHERE caja_id=@caja_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'cajas_update', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE cajas_delete
  @caja_id INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM cajas WHERE caja_id=@caja_id)
      THROW 52010, 'La caja ya no se encuentra en la base de datos.', 1;
    IF EXISTS (SELECT 1 FROM cajas_detalles WHERE caja_id=@caja_id)
      THROW 52011, 'No se puede eliminar: la caja tiene stock o referencias.', 1;
    DELETE FROM cajas WHERE caja_id=@caja_id;
    COMMIT;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen,mensaje) VALUES(N'cajas_delete',ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE cajas_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT caja_id, letra, cara, nivel, etiqueta
  FROM cajas
  ORDER BY LEN(letra), letra,
           CASE cara WHEN 1 THEN 1 ELSE 2 END,
           CASE nivel WHEN 1 THEN 1 ELSE 2 END;
END;
GO

CREATE OR ALTER PROCEDURE cajas_get_list
AS
BEGIN
  SET NOCOUNT ON;
  SELECT caja_id, etiqueta
  FROM cajas
  ORDER BY LEN(letra), letra,
           CASE cara WHEN 1 THEN 1 ELSE 2 END,
           CASE nivel WHEN 1 THEN 1 ELSE 2 END;
END;
GO

CREATE OR ALTER PROCEDURE cajas_get_by_id
  @caja_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT caja_id, letra, cara, nivel, etiqueta
  FROM cajas WHERE caja_id=@caja_id;
END;
GO

/* =========================================================
   PROCEDIMIENTOS: CATEGORIAS
   ========================================================= */
CREATE OR ALTER PROCEDURE categorias_insert
  @nombre NVARCHAR(100),
  @descripcion NVARCHAR(255) = NULL
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    SET @nombre = LTRIM(RTRIM(@nombre));
    IF @nombre IS NULL OR @nombre='' THROW 51001,'El nombre de categoría es obligatorio.',1;
    IF EXISTS (SELECT 1 FROM categorias WHERE nombre=@nombre)
      THROW 51006,'Ya existe otra categoría con ese nombre.',1;
    INSERT INTO categorias(nombre, descripcion) VALUES(@nombre, @descripcion);
    COMMIT;
    SELECT categoria_id, nombre, descripcion
    FROM categorias WHERE categoria_id=SCOPE_IDENTITY();
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'categorias_insert', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE categorias_update
  @categoria_id INT, @nombre NVARCHAR(100), @descripcion NVARCHAR(255) = NULL
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM categorias WHERE categoria_id=@categoria_id)
      THROW 51002,'Categoría no encontrada.',1;
    SET @nombre = LTRIM(RTRIM(@nombre));
    IF @nombre IS NULL OR @nombre='' THROW 51003,'El nombre de categoría es obligatorio.',1;
    IF EXISTS (SELECT 1 FROM categorias WHERE nombre=@nombre AND categoria_id<>@categoria_id)
      THROW 51004,'Ya existe otra categoría con ese nombre.',1;
    UPDATE categorias SET nombre=@nombre, descripcion=@descripcion WHERE categoria_id=@categoria_id;
    COMMIT;
    SELECT categoria_id, nombre, descripcion FROM categorias WHERE categoria_id=@categoria_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'categorias_update', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE categorias_delete
  @categoria_id INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF EXISTS (SELECT 1 FROM productos WHERE categoria_id=@categoria_id)
      THROW 51005,'No se puede eliminar: hay productos en esta categoría.',1;
    DELETE FROM categorias WHERE categoria_id=@categoria_id;
    COMMIT;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'categorias_delete', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE categorias_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT categoria_id, nombre, descripcion
  FROM categorias
  ORDER BY nombre;
END;
GO

CREATE OR ALTER PROCEDURE categorias_get_list
AS
BEGIN
  SET NOCOUNT ON;
  SELECT categoria_id, nombre FROM categorias ORDER BY nombre;
END;
GO

CREATE OR ALTER PROCEDURE categorias_get_by_id
  @categoria_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT categoria_id, nombre, descripcion
  FROM categorias WHERE categoria_id=@categoria_id;
END;
GO

/* =========================================================
   PROCEDIMIENTOS: PRODUCTOS (CRUD + consultas)
   ========================================================= */
CREATE OR ALTER PROCEDURE productos_insert
  @nombre NVARCHAR(100),
  @descripcion NVARCHAR(255) = NULL,
  @precio DECIMAL(10,2),
  @categoria_id INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    SET @nombre = LTRIM(RTRIM(@nombre));
    IF @nombre IS NULL OR @nombre=''   THROW 52031, 'El nombre del producto es obligatorio.', 1;
    IF @precio IS NULL OR @precio < 0  THROW 52012, 'Precio inválido.', 1;
    IF EXISTS (SELECT 1 FROM productos WHERE nombre=@nombre)
      THROW 52018, 'Ya existe otro producto con ese nombre.', 1;
    IF NOT EXISTS (SELECT 1 FROM categorias WHERE categoria_id=@categoria_id)
      THROW 52013, 'Categoría no existe.', 1;

    INSERT INTO productos (nombre, descripcion, precio, categoria_id)
    VALUES (@nombre, @descripcion, @precio, @categoria_id);

    COMMIT;
    SELECT producto_id, nombre, descripcion, precio, categoria_id, estado
    FROM productos WHERE producto_id=SCOPE_IDENTITY();
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'productos_insert', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE productos_update
  @producto_id INT,
  @nombre NVARCHAR(100),
  @descripcion NVARCHAR(255) = NULL,
  @precio DECIMAL(10,2),
  @categoria_id INT,
  @estado BIT = 1
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id=@producto_id)
      THROW 52014, 'Producto no encontrado.', 1;
    SET @nombre = LTRIM(RTRIM(@nombre));
    IF @nombre IS NULL OR @nombre=''  THROW 52015, 'El nombre del producto es obligatorio.', 1;
    IF @precio IS NULL OR @precio < 0 THROW 52016, 'Precio inválido.', 1;
    IF NOT EXISTS (SELECT 1 FROM categorias WHERE categoria_id=@categoria_id)
      THROW 52017, 'Categoría no existe.', 1;
    IF EXISTS (SELECT 1 FROM productos WHERE nombre=@nombre AND producto_id<>@producto_id)
      THROW 52018, 'Ya existe otro producto con ese nombre.', 1;

    IF @estado IS NULL SELECT @estado = estado FROM productos WHERE producto_id=@producto_id;

    UPDATE productos
    SET nombre=@nombre, descripcion=@descripcion, precio=@precio,
        categoria_id=@categoria_id, estado=@estado
    WHERE producto_id=@producto_id;

    COMMIT;
    SELECT producto_id, nombre, descripcion, precio, categoria_id, estado
    FROM productos WHERE producto_id=@producto_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'productos_update', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE productos_soft_delete
  @producto_id INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id=@producto_id)
      THROW 52020, 'Producto no encontrado.', 1;
    UPDATE productos SET estado = 0 WHERE producto_id=@producto_id;
    COMMIT;
    SELECT producto_id, nombre, descripcion, precio, categoria_id, estado
    FROM productos WHERE producto_id=@producto_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'productos_soft_delete', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE productos_set_precio
  @producto_id INT, @precio DECIMAL(10,2)
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF @precio IS NULL OR @precio < 0 THROW 52019, 'Precio inválido.', 1;
    UPDATE productos SET precio=@precio WHERE producto_id=@producto_id;
    IF @@ROWCOUNT=0 THROW 52020, 'Producto no encontrado.', 1;
    COMMIT;
    SELECT producto_id, nombre, descripcion, precio, categoria_id, estado
    FROM productos WHERE producto_id=@producto_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'productos_set_precio', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

-- Listados y consultas
CREATE OR ALTER PROCEDURE productos_get_all
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id,
         COALESCE(SUM(cd.stock),0) AS stock, p.estado
  FROM productos p
  LEFT JOIN cajas_detalles cd ON cd.producto_id=p.producto_id
  GROUP BY p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id, p.estado
  ORDER BY p.estado DESC, p.nombre;
END;
GO

CREATE OR ALTER PROCEDURE productos_get_all_active
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id,
         COALESCE(SUM(cd.stock),0) AS stock
  FROM productos p
  LEFT JOIN cajas_detalles cd ON cd.producto_id=p.producto_id
  WHERE p.estado=1
  GROUP BY p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id
  ORDER BY p.nombre;
END;
GO

CREATE OR ALTER PROCEDURE productos_get_list
AS
BEGIN
  SET NOCOUNT ON;
  SELECT producto_id, nombre, categoria_id
  FROM productos
  WHERE estado=1
  ORDER BY nombre;
END;
GO

CREATE OR ALTER PROCEDURE productos_get_by_id
  @producto_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id,
         COALESCE(SUM(cd.stock),0) AS stock
  FROM productos p
  LEFT JOIN cajas_detalles cd ON cd.producto_id=p.producto_id
  WHERE p.estado=1 AND p.producto_id=@producto_id
  GROUP BY p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id;
END;
GO

CREATE OR ALTER PROCEDURE productos_get_list_by_category_id
  @categoria_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT producto_id, nombre, categoria_id
  FROM productos
  WHERE estado=1 AND categoria_id=@categoria_id
  ORDER BY nombre;
END;
GO

CREATE OR ALTER PROCEDURE productos_get_by_caja_id
  @caja_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT cd.detalle_id,
         p.producto_id, p.nombre AS producto_nombre, p.descripcion, p.precio,
         p.categoria_id, cat.nombre AS categoria_nombre,
         cd.stock, c.etiqueta AS caja_etiqueta
  FROM cajas_detalles cd
  JOIN productos p  ON cd.producto_id=p.producto_id
  JOIN categorias cat ON p.categoria_id=cat.categoria_id
  JOIN cajas c ON cd.caja_id=c.caja_id
  WHERE cd.caja_id=@caja_id AND p.estado=1
  ORDER BY p.nombre;
END;
GO

CREATE OR ALTER PROCEDURE productos_search_by_price_range
  @precio_min DECIMAL(10,2) = NULL,
  @precio_max DECIMAL(10,2) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id,
         c.nombre AS categoria_nombre,
         COALESCE(SUM(cd.stock),0) AS stock_total
  FROM productos p
  JOIN categorias c ON p.categoria_id=c.categoria_id
  LEFT JOIN cajas_detalles cd ON p.producto_id=cd.producto_id
  WHERE p.estado=1
    AND (@precio_min IS NULL OR p.precio>=@precio_min)
    AND (@precio_max IS NULL OR p.precio<=@precio_max)
  GROUP BY p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id, c.nombre
  ORDER BY p.precio, p.nombre;
END;
GO

CREATE OR ALTER PROCEDURE productos_search_by_name
  @search_term NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  IF @search_term IS NULL OR LTRIM(RTRIM(@search_term))=''
    THROW 55001,'El término de búsqueda no puede estar vacío.',1;

  SELECT p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id,
         c.nombre AS categoria_nombre,
         COALESCE(SUM(cd.stock),0) AS stock_total
  FROM productos p
  JOIN categorias c ON p.categoria_id=c.categoria_id
  LEFT JOIN cajas_detalles cd ON p.producto_id=cd.producto_id
  WHERE p.estado=1 AND (p.nombre LIKE '%'+@search_term+'%' OR p.descripcion LIKE '%'+@search_term+'%')
  GROUP BY p.producto_id, p.nombre, p.descripcion, p.precio, p.categoria_id, c.nombre
  ORDER BY p.nombre;
END;
GO

CREATE OR ALTER PROCEDURE productos_get_by_cajas
AS
BEGIN
  SET NOCOUNT ON;
  SELECT c.caja_id, c.etiqueta AS caja_etiqueta,
         p.producto_id, p.nombre AS producto_nombre,
         cd.stock, cat.nombre AS categoria_nombre, p.precio,
         (cd.stock * p.precio) AS valor_en_caja
  FROM cajas c
  LEFT JOIN cajas_detalles cd ON c.caja_id=cd.caja_id
  LEFT JOIN productos p ON cd.producto_id=p.producto_id
  LEFT JOIN categorias cat ON p.categoria_id=cat.categoria_id
  WHERE p.estado=1 OR p.estado IS NULL
  ORDER BY LEN(c.letra), c.letra,
           CASE c.cara WHEN 1 THEN 1 ELSE 2 END,
           CASE c.nivel WHEN 1 THEN 1 ELSE 2 END,
           p.nombre;
END;
GO

CREATE OR ALTER PROCEDURE productos_get_detalle_completo
  @producto_id INT
AS
BEGIN
  SET NOCOUNT ON;
  -- cabecera
  SELECT p.producto_id, p.nombre, p.descripcion, p.precio,
         p.categoria_id, cat.nombre AS categoria_nombre,
         p.estado, COALESCE(SUM(cd.stock),0) AS stock_total
  FROM productos p
  JOIN categorias cat ON p.categoria_id=cat.categoria_id
  LEFT JOIN cajas_detalles cd ON p.producto_id=cd.producto_id
  WHERE p.producto_id=@producto_id
  GROUP BY p.producto_id, p.nombre, p.descripcion, p.precio,
           p.categoria_id, cat.nombre, p.estado;
  -- detalle por caja
  SELECT cd.detalle_id, c.caja_id, c.etiqueta AS caja_etiqueta,
         cd.stock, (cd.stock * p.precio) AS valor_en_caja
  FROM cajas_detalles cd
  JOIN cajas c ON cd.caja_id=c.caja_id
  JOIN productos p ON cd.producto_id=p.producto_id
  WHERE cd.producto_id=@producto_id
  ORDER BY LEN(c.letra), c.letra,
           CASE c.cara WHEN 1 THEN 1 ELSE 2 END,
           CASE c.nivel WHEN 1 THEN 1 ELSE 2 END;
END;
GO

/* =========================================================
   PROCEDIMIENTOS: STOCK (detalle)
   ========================================================= */
CREATE OR ALTER PROCEDURE cajas_detalles_insert
  @caja_id INT, @producto_id INT, @stock INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF @stock IS NULL OR @stock < 0 THROW 53001,'Stock inválido (negativo).',1;
    IF NOT EXISTS (SELECT 1 FROM cajas WHERE caja_id=@caja_id) THROW 53002,'Caja no existe.',1;
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id=@producto_id AND estado=1)
      THROW 53003,'Producto no existe o está inactivo.',1;
    IF EXISTS (SELECT 1 FROM cajas_detalles WHERE caja_id=@caja_id AND producto_id=@producto_id)
      THROW 53004,'Ya existe stock para ese producto en la caja.',1;

    INSERT INTO cajas_detalles(caja_id, producto_id, stock) VALUES(@caja_id, @producto_id, @stock);
    COMMIT;
    SELECT detalle_id, caja_id, producto_id, stock
    FROM cajas_detalles WHERE detalle_id=SCOPE_IDENTITY();
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'cajas_detalles_insert', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE cajas_detalles_update
  @detalle_id INT, @caja_id INT, @producto_id INT, @stock INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM cajas_detalles WHERE detalle_id=@detalle_id)
      THROW 53005,'Detalle no encontrado.',1;
    IF @stock IS NULL OR @stock < 0 THROW 53006,'Stock inválido (negativo).',1;
    IF NOT EXISTS (SELECT 1 FROM cajas WHERE caja_id=@caja_id) THROW 53007,'Caja no existe.',1;
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id=@producto_id AND estado=1)
      THROW 53008,'Producto no existe o está inactivo.',1;
    IF EXISTS (SELECT 1 FROM cajas_detalles WHERE caja_id=@caja_id AND producto_id=@producto_id AND detalle_id<>@detalle_id)
      THROW 53009,'Otra fila ya tiene ese (caja, producto).',1;

    UPDATE cajas_detalles
    SET caja_id=@caja_id, producto_id=@producto_id, stock=@stock
    WHERE detalle_id=@detalle_id;
    COMMIT;
    SELECT detalle_id, caja_id, producto_id, stock
    FROM cajas_detalles WHERE detalle_id=@detalle_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'cajas_detalles_update', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE cajas_detalles_delete
  @detalle_id INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF EXISTS (SELECT 1 FROM cajas_detalles WHERE detalle_id=@detalle_id AND stock>0)
      THROW 53020,'No se puede eliminar un detalle con stock > 0.',1;
    DELETE FROM cajas_detalles WHERE detalle_id=@detalle_id;
    IF @@ROWCOUNT=0 THROW 53021,'Detalle no encontrado.',1;
    COMMIT;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'cajas_detalles_delete', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE cajas_detalles_get_by_id
  @detalle_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT d.detalle_id, d.caja_id, c.etiqueta, d.producto_id, d.stock
  FROM cajas_detalles d
  JOIN cajas c ON c.caja_id=d.caja_id
  WHERE d.detalle_id=@detalle_id;
END;
GO

CREATE OR ALTER PROCEDURE cajas_detalles_get_by_producto
  @producto_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT d.detalle_id, c.etiqueta, d.producto_id, d.stock
  FROM cajas_detalles d
  JOIN cajas c ON c.caja_id=d.caja_id
  WHERE d.producto_id=@producto_id
  ORDER BY LEN(c.letra), c.letra,
           CASE c.cara WHEN 1 THEN 1 ELSE 2 END,
           CASE c.nivel WHEN 1 THEN 1 ELSE 2 END;
END;
GO

/* =========================================================
   PROCEDIMIENTOS: CONTROL DE STOCK (agregar, remover, mover)
   ========================================================= */
CREATE OR ALTER PROCEDURE get_stock_by_id
  @producto_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT d.detalle_id, c.etiqueta, d.producto_id, d.stock
  FROM cajas_detalles d
  JOIN cajas c ON c.caja_id=d.caja_id
  WHERE d.producto_id=@producto_id
  ORDER BY LEN(c.letra), c.letra,
           CASE c.cara WHEN 1 THEN 1 ELSE 2 END,
           CASE c.nivel WHEN 1 THEN 1 ELSE 2 END;
END;
GO

CREATE OR ALTER PROCEDURE productos_get_stock
  @producto_id INT
AS
BEGIN
  SET NOCOUNT ON;
  EXEC get_stock_by_id @producto_id=@producto_id;
END;
GO

CREATE OR ALTER PROCEDURE productos_add_stock
  @caja_id INT, @producto_id INT, @delta INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    IF @delta IS NULL OR @delta <= 0 THROW 54001,'Delta debe ser > 0.',1;
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id=@producto_id AND estado=1)
      THROW 54002,'Producto no existe o está inactivo.',1;
    IF NOT EXISTS (SELECT 1 FROM cajas WHERE caja_id=@caja_id)
      THROW 54003,'Caja no existe.',1;

    SELECT 1 FROM cajas_detalles WITH (UPDLOCK, HOLDLOCK)
    WHERE caja_id=@caja_id AND producto_id=@producto_id;

    IF EXISTS (SELECT 1 FROM cajas_detalles WHERE caja_id=@caja_id AND producto_id=@producto_id)
      UPDATE cajas_detalles SET stock = stock + @delta
      WHERE caja_id=@caja_id AND producto_id=@producto_id;
    ELSE
      INSERT INTO cajas_detalles(caja_id, producto_id, stock)
      VALUES(@caja_id, @producto_id, @delta);

    COMMIT;
    SELECT detalle_id, caja_id, producto_id, stock
    FROM cajas_detalles WHERE caja_id=@caja_id AND producto_id=@producto_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'productos_add_stock', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE productos_remove_stock
  @caja_id INT, @producto_id INT, @delta INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    IF @delta IS NULL OR @delta <= 0 THROW 54004,'Delta debe ser > 0.',1;
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id=@producto_id AND estado=1)
      THROW 54005,'Producto no existe o está inactivo.',1;
    IF NOT EXISTS (SELECT 1 FROM cajas_detalles WHERE caja_id=@caja_id AND producto_id=@producto_id)
      THROW 54006,'No existe stock en la caja indicada.',1;

    DECLARE @actual INT;
    SELECT @actual = stock FROM cajas_detalles WITH (UPDLOCK, HOLDLOCK)
    WHERE caja_id=@caja_id AND producto_id=@producto_id;
    IF @actual < @delta THROW 54007,'Stock insuficiente para remover.',1;

    UPDATE cajas_detalles SET stock = stock - @delta
    WHERE caja_id=@caja_id AND producto_id=@producto_id;

    COMMIT;
    SELECT detalle_id, caja_id, producto_id, stock
    FROM cajas_detalles WHERE caja_id=@caja_id AND producto_id=@producto_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'productos_remove_stock', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE productos_set_stock_by_detalle
  @detalle_id INT, @producto_id INT, @stock INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    IF @stock IS NULL OR @stock < 0 THROW 54008,'Stock inválido (negativo).',1;
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id=@producto_id AND estado=1)
      THROW 54009,'Producto no existe o está inactivo.',1;
    IF NOT EXISTS (SELECT 1 FROM cajas_detalles WHERE detalle_id=@detalle_id AND producto_id=@producto_id)
      THROW 54010,'Detalle no existe o no corresponde al producto.',1;

    UPDATE cajas_detalles SET stock=@stock
    WHERE detalle_id=@detalle_id AND producto_id=@producto_id;

    COMMIT;
    SELECT d.detalle_id, c.etiqueta, d.producto_id, d.stock
    FROM cajas_detalles d JOIN cajas c ON c.caja_id=d.caja_id
    WHERE d.detalle_id=@detalle_id AND d.producto_id=@producto_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'productos_set_stock_by_detalle', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE productos_move_stock
  @producto_id INT, @caja_origen INT, @caja_destino INT, @cantidad INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  IF @cantidad IS NULL OR @cantidad <= 0
    THROW 54020,'Cantidad debe ser > 0.',1;
  IF @caja_origen=@caja_destino
    THROW 54023,'La caja de origen y destino deben ser distintas.',1;

  BEGIN TRY
    BEGIN TRAN;
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id=@producto_id AND estado=1)
      THROW 54024,'Producto no existe o está inactivo.',1;
    IF NOT EXISTS (SELECT 1 FROM cajas WHERE caja_id=@caja_origen)
      THROW 54025,'Caja de origen no existe.',1;
    IF NOT EXISTS (SELECT 1 FROM cajas WHERE caja_id=@caja_destino)
      THROW 54026,'Caja de destino no existe.',1;

    DECLARE @actual INT;
    SELECT @actual=stock FROM cajas_detalles WITH (UPDLOCK, HOLDLOCK)
    WHERE caja_id=@caja_origen AND producto_id=@producto_id;
    IF @actual IS NULL THROW 54021,'No existe registro de stock en caja origen.',1;
    IF @actual < @cantidad THROW 54022,'Stock insuficiente en origen.',1;

    UPDATE cajas_detalles SET stock = stock - @cantidad
    WHERE caja_id=@caja_origen AND producto_id=@producto_id;

    SELECT 1 FROM cajas_detalles WITH (UPDLOCK, HOLDLOCK)
    WHERE caja_id=@caja_destino AND producto_id=@producto_id;

    IF EXISTS (SELECT 1 FROM cajas_detalles WHERE caja_id=@caja_destino AND producto_id=@producto_id)
      UPDATE cajas_detalles SET stock = stock + @cantidad
      WHERE caja_id=@caja_destino AND producto_id=@producto_id;
    ELSE
      INSERT INTO cajas_detalles(caja_id, producto_id, stock)
      VALUES(@caja_destino, @producto_id, @cantidad);

    COMMIT;

    SELECT 'origen' AS tipo, d.detalle_id, c.etiqueta, d.producto_id, d.stock
    FROM cajas_detalles d JOIN cajas c ON c.caja_id=d.caja_id
    WHERE d.caja_id=@caja_origen AND d.producto_id=@producto_id
    UNION ALL
    SELECT 'destino', d.detalle_id, c.etiqueta, d.producto_id, d.stock
    FROM cajas_detalles d JOIN cajas c ON c.caja_id=d.caja_id
    WHERE d.caja_id=@caja_destino AND d.producto_id=@producto_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje)
    VALUES(N'productos_move_stock',
           CONCAT('N°',ERROR_NUMBER(),' L',ERROR_LINE(),' [',ISNULL(ERROR_PROCEDURE(),'-'),'] ',ERROR_MESSAGE()));
    THROW;
  END CATCH
END;
GO

/* =========================================================
   PROCEDIMIENTOS: REPORTES DE STOCK (no auditoría)
   ========================================================= */
CREATE OR ALTER PROCEDURE get_all_stock
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.producto_id, p.nombre, p.precio,
         COALESCE(SUM(cd.stock),0) AS stock,
         CAST(CAST(COALESCE(SUM(cd.stock),0) AS DECIMAL(18,2)) * CAST(p.precio AS DECIMAL(18,2)) AS DECIMAL(18,2))
           AS valor_inventario
  FROM productos p
  LEFT JOIN cajas_detalles cd ON cd.producto_id=p.producto_id
  GROUP BY p.producto_id, p.nombre, p.precio
  ORDER BY p.nombre;
END;
GO

CREATE OR ALTER PROCEDURE get_stock
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.producto_id, p.nombre AS producto_nombre,
         COALESCE(SUM(cd.stock),0) AS stock_total
  FROM productos p
  LEFT JOIN cajas_detalles cd ON cd.producto_id=p.producto_id
  WHERE p.estado=1
  GROUP BY p.producto_id, p.nombre
  ORDER BY p.nombre;
END;
GO

CREATE OR ALTER PROCEDURE get_stock_by_categoria_id
  @categoria_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.producto_id, p.nombre AS producto_nombre,
         c.categoria_id, c.nombre AS categoria_nombre,
         COALESCE(SUM(cd.stock),0) AS stock_total
  FROM productos p
  JOIN categorias c ON c.categoria_id=p.categoria_id
  LEFT JOIN cajas_detalles cd ON cd.producto_id=p.producto_id
  WHERE p.estado=1 AND p.categoria_id=@categoria_id
  GROUP BY p.producto_id, p.nombre, c.categoria_id, c.nombre
  ORDER BY p.nombre;
END;
GO

/* =========================================================
   PROCEDIMIENTOS: USUARIOS (sin auditoría ni triggers)
   ========================================================= */

-- INSERT con @tipo (opcional) y validación
CREATE OR ALTER PROCEDURE usuarios_insert
  @nombre NVARCHAR(100),
  @contrasena NVARCHAR(255),
  @email NVARCHAR(150),
  @tipo NVARCHAR(10) = NULL  -- 'Usuario' (default) o 'Admin'
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;

    SELECT @tipo = COALESCE(NULLIF(LTRIM(RTRIM(@tipo)), N''), N'Usuario');
    IF @tipo NOT IN (N'Usuario', N'Admin')
      THROW 56012, 'Tipo inválido. Use ''Usuario'' o ''Admin''.', 1;

    IF @email NOT LIKE '%_@__%.__%' THROW 56001,'Formato de email inválido.',1;
    IF EXISTS (SELECT 1 FROM usuarios WHERE nombre=@nombre)
      THROW 56002,'El nombre de usuario ya existe.',1;
    IF EXISTS (SELECT 1 FROM usuarios WHERE email=@email)
      THROW 56003,'El email ya está registrado.',1;

    INSERT INTO usuarios(nombre, contrasena, email, tipo)
    VALUES(@nombre, @contrasena, @email, @tipo);

    COMMIT;
    SELECT usuario_id, nombre, email, estado, tipo
    FROM usuarios WHERE usuario_id = SCOPE_IDENTITY();
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'usuarios_insert', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

-- UPDATE con @tipo (opcional)
CREATE OR ALTER PROCEDURE usuarios_update
  @usuario_id INT,
  @nombre NVARCHAR(100),
  @email NVARCHAR(150),
  @tipo NVARCHAR(10) = NULL  -- si viene NULL, se mantiene el actual
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;

    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_id=@usuario_id)
      THROW 56004,'usuario_id no existe.',1;

    IF EXISTS (SELECT 1 FROM usuarios WHERE nombre=@nombre AND usuario_id<>@usuario_id)
      THROW 56005,'El nombre ya está en uso por otro usuario.',1;

    IF EXISTS (SELECT 1 FROM usuarios WHERE email=@email AND usuario_id<>@usuario_id)
      THROW 56006,'El email ya está en uso por otro usuario.',1;

    IF @tipo IS NOT NULL AND @tipo NOT IN (N'Usuario', N'Admin')
      THROW 56012, 'Tipo inválido. Use ''Usuario'' o ''Admin''.', 1;

    UPDATE usuarios
      SET nombre = @nombre,
          email  = @email,
          tipo   = COALESCE(@tipo, tipo)
    WHERE usuario_id = @usuario_id;

    COMMIT;
    SELECT usuario_id, nombre, email, estado, tipo
    FROM usuarios WHERE usuario_id=@usuario_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'usuarios_update', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

-- Cambiar rol genéricamente
CREATE OR ALTER PROCEDURE usuarios_set_tipo
  @usuario_id INT,
  @tipo NVARCHAR(10)  -- 'Usuario' o 'Admin'
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;

    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_id=@usuario_id)
      THROW 56013,'usuario_id no existe.',1;

    IF @tipo NOT IN (N'Usuario', N'Admin')
      THROW 56012, 'Tipo inválido. Use ''Usuario'' o ''Admin''.', 1;

    UPDATE usuarios SET tipo=@tipo WHERE usuario_id=@usuario_id;

    COMMIT;
    SELECT usuario_id, nombre, email, estado, tipo
    FROM usuarios WHERE usuario_id=@usuario_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'usuarios_set_tipo', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

-- Atajo: poner al usuario como 'Admin'
CREATE OR ALTER PROCEDURE usuarios_set_admin
  @usuario_id INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;

    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_id=@usuario_id)
      THROW 56013,'usuario_id no existe.',1;

    UPDATE usuarios SET tipo = N'Admin' WHERE usuario_id=@usuario_id;

    COMMIT;
    SELECT usuario_id, nombre, email, estado, tipo
    FROM usuarios WHERE usuario_id=@usuario_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'usuarios_set_admin', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE usuario_por_id
  @usuario_id INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT usuario_id, nombre, contrasena, email, fecha_registro, estado, tipo
  FROM usuarios WHERE usuario_id=@usuario_id;
END;
GO

CREATE OR ALTER PROCEDURE usuario_por_email
  @email NVARCHAR(150)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP (1)
    usuario_id, nombre, email, fecha_registro, estado, tipo
  FROM usuarios
  WHERE email = @email;
END;
GO

CREATE OR ALTER PROCEDURE buscar_id_para_login
  @email NVARCHAR(150)
AS
BEGIN
  SET NOCOUNT ON;
  IF @email IS NULL OR LTRIM(RTRIM(@email)) = '' RETURN;

  SELECT TOP (1)
    CAST(usuario_id AS NVARCHAR(50)) AS id,
    contrasena,
    nombre,
    email,
    tipo
  FROM usuarios
  WHERE estado = 1
    AND email = @email;
END;
GO

