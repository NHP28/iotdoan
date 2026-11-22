CREATE TABLE IF NOT EXISTS driver_face_datasets (
  driver_id INT NOT NULL PRIMARY KEY,
  samples LONGTEXT NOT NULL,
  sample_count INT NOT NULL,
  source VARCHAR(20) NOT NULL,
  media_data MEDIUMBLOB NULL,
  media_mime VARCHAR(30) NULL,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_face_dataset_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
