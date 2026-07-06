resource "aws_apprunner_service" "api" {
  service_name = "${var.project}-${var.environment}-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }
    auto_deployments_enabled = false # el CD pipeline dispara start-deployment explícitamente
    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = "3001"
        runtime_environment_variables = {
          PORT     = "3001"
          HOST     = "0.0.0.0" # requerido: el default de la app es 127.0.0.1 (solo loopback), inalcanzable desde fuera del contenedor
          NODE_ENV = "production"
          WEB_URL  = var.web_url
        }
        runtime_environment_secrets = {
          DATABASE_URL           = aws_secretsmanager_secret.db_url.arn
          JWT_SECRET             = aws_secretsmanager_secret.jwt_secret.arn
          STRIPE_SECRET_KEY      = aws_secretsmanager_secret.stripe_secret_key.arn
          STRIPE_WEBHOOK_SECRET  = aws_secretsmanager_secret.stripe_webhook_secret.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.apprunner_api_cpu
    memory            = var.apprunner_api_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol = "HTTP"
    path     = "/health"
    interval = 10
    timeout  = 5
  }

  tags = { Name = "${var.project}-${var.environment}-api" }
}

resource "aws_apprunner_service" "web" {
  service_name = "${var.project}-${var.environment}-web"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }
    auto_deployments_enabled = false
    image_repository {
      image_identifier      = "${aws_ecr_repository.web.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = "3000"
        runtime_environment_variables = {
          NODE_ENV = "production"
          # NEXT_PUBLIC_API_URL se hornea en build-time (build-arg del Dockerfile),
          # no se puede setear en runtime — ver DEPLOYMENT.md, paso de bootstrap.
        }
      }
    }
  }

  instance_configuration {
    cpu    = var.apprunner_web_cpu
    memory = var.apprunner_web_memory
  }

  tags = { Name = "${var.project}-${var.environment}-web" }
}
