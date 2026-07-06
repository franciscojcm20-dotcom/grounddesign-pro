resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "web" {
  name                 = "${var.project}-web"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Conserva solo las últimas 10 imágenes por repo — evita crecimiento de costo indefinido.
locals {
  ecr_keep_last_10_policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Mantener solo las 10 imágenes más recientes"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy     = local.ecr_keep_last_10_policy
}

resource "aws_ecr_lifecycle_policy" "web" {
  repository = aws_ecr_repository.web.name
  policy     = local.ecr_keep_last_10_policy
}
