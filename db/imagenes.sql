/* =========================================================
   TABLA: IMAGENES
   ========================================================= */
DROP TABLE IF EXISTS imagenes;
GO
CREATE TABLE imagenes (
  imagen_id   INT IDENTITY(1,1) PRIMARY KEY,
  producto_id INT NOT NULL,
  image_path  NVARCHAR(255) NOT NULL,
  
  CONSTRAINT fk_imagenes_producto 
    FOREIGN KEY (producto_id) 
    REFERENCES productos(producto_id)
);
GO

/* =========================================================
   PROCEDIMIENTOS: IMAGENES
   ========================================================= */

------------------------------------------------------------
-- INSERT
------------------------------------------------------------
CREATE OR ALTER PROCEDURE imagenes_insert
  @producto_id INT,
  @image_path  NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    
    -- Validaciones
    IF @producto_id IS NULL OR @producto_id <= 0
      THROW 53001, 'El producto_id es obligatorio.', 1;
      
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id = @producto_id)
      THROW 53002, 'El producto especificado no existe.', 1;

    SET @image_path = LTRIM(RTRIM(@image_path));
    IF @image_path IS NULL OR @image_path = ''
      THROW 53003, 'El image_path es obligatorio.', 1;

    -- Inserción
    INSERT INTO imagenes (producto_id, image_path)
    VALUES (@producto_id, @image_path);
    
    COMMIT;
    
    SELECT imagen_id, producto_id, image_path 
    FROM imagenes 
    WHERE imagen_id = SCOPE_IDENTITY();
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'imagenes_insert', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

------------------------------------------------------------
-- UPDATE
------------------------------------------------------------
CREATE OR ALTER PROCEDURE imagenes_update
  @imagen_id   INT,
  @producto_id INT,
  @image_path  NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    
    IF NOT EXISTS (SELECT 1 FROM imagenes WHERE imagen_id = @imagen_id)
      THROW 53004, 'Imagen no encontrada.', 1;

    -- Validaciones
    IF @producto_id IS NULL OR @producto_id <= 0
      THROW 53005, 'El producto_id es obligatorio.', 1;
      
    IF NOT EXISTS (SELECT 1 FROM productos WHERE producto_id = @producto_id)
      THROW 53006, 'El producto especificado no existe.', 1;

    SET @image_path = LTRIM(RTRIM(@image_path));
    IF @image_path IS NULL OR @image_path = ''
      THROW 53007, 'El image_path es obligatorio.', 1;

    -- Actualización
    UPDATE imagenes 
    SET producto_id = @producto_id, 
        image_path  = @image_path
    WHERE imagen_id = @imagen_id;
    
    COMMIT;
    
    SELECT imagen_id, producto_id, image_path 
    FROM imagenes 
    WHERE imagen_id = @imagen_id;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'imagenes_update', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

------------------------------------------------------------
-- DELETE
------------------------------------------------------------
CREATE OR ALTER PROCEDURE imagenes_delete
  @imagen_id INT
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
    BEGIN TRAN;
    
    IF NOT EXISTS (SELECT 1 FROM imagenes WHERE imagen_id = @imagen_id)
      THROW 53008, 'Imagen no encontrada.', 1;

    DELETE FROM imagenes WHERE imagen_id = @imagen_id;
    
    COMMIT;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    INSERT INTO logs(origen, mensaje) VALUES(N'imagenes_delete', ERROR_MESSAGE());
    THROW;
  END CATCH
END;
GO

------------------------------------------------------------
-- GET BY PRODUCTO_ID
------------------------------------------------------------
CREATE OR ALTER PROCEDURE imagenes_get_by_producto_id
  @producto_id INT
AS
BEGIN
  SET NOCOUNT ON;
  
  SELECT imagen_id, producto_id, image_path
  FROM imagenes
  WHERE producto_id = @producto_id
  ORDER BY imagen_id;
END;
GO