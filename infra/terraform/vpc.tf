# VPC mínima: RDS vive en subnets privadas; App Runner alcanza la red vía un
# VPC Connector (no expone RDS a internet, no requiere ALB ni NAT gateway).

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project}-${var.environment}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "${var.project}-${var.environment}-private-${count.index}" }
}

resource "aws_security_group" "rds" {
  name        = "${var.project}-${var.environment}-rds"
  description = "Permite conexión a Postgres solo desde el VPC Connector de App Runner"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres desde App Runner"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.apprunner_connector.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-${var.environment}-rds" }
}

resource "aws_security_group" "apprunner_connector" {
  name        = "${var.project}-${var.environment}-apprunner-connector"
  description = "Security group del VPC Connector usado por los servicios App Runner"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-${var.environment}-apprunner-connector" }
}

resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${var.project}-${var.environment}-connector"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.apprunner_connector.id]
}
