resource "random_password" "db" {
  length  = 32
  special = false # evita caracteres que rompen connection strings sin escapar
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-${var.environment}"
  engine         = "postgres"
  engine_version = "16"

  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  backup_retention_period = 7
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project}-${var.environment}-final" : null
  deletion_protection     = var.environment == "prod"

  tags = { Name = "${var.project}-${var.environment}" }
}
