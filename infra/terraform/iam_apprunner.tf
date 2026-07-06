# Rol que App Runner asume para hacer pull de la imagen desde ECR.
data "aws_iam_policy_document" "apprunner_assume_build" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_ecr_access" {
  name               = "${var.project}-${var.environment}-apprunner-ecr-access"
  assume_role_policy = data.aws_iam_policy_document.apprunner_assume_build.json
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Rol que asume la instancia en ejecución del servicio (para leer Secrets Manager en runtime).
data "aws_iam_policy_document" "apprunner_assume_instance" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_instance" {
  name               = "${var.project}-${var.environment}-apprunner-instance"
  assume_role_policy = data.aws_iam_policy_document.apprunner_assume_instance.json
}

data "aws_iam_policy_document" "apprunner_read_secrets" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      aws_secretsmanager_secret.jwt_secret.arn,
      aws_secretsmanager_secret.db_url.arn,
      aws_secretsmanager_secret.stripe_secret_key.arn,
      aws_secretsmanager_secret.stripe_webhook_secret.arn,
      aws_secretsmanager_secret.smtp_credentials.arn,
    ]
  }
}

resource "aws_iam_role_policy" "apprunner_read_secrets" {
  name   = "${var.project}-${var.environment}-read-secrets"
  role   = aws_iam_role.apprunner_instance.id
  policy = data.aws_iam_policy_document.apprunner_read_secrets.json
}
