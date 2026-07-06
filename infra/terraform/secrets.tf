# Secrets con valor inicial vacío/generado — se completan a mano en la consola
# de Secrets Manager (Stripe, SMTP) o quedan autogenerados (JWT). Terraform no
# vuelve a pisar el valor tras el primer apply gracias a `ignore_changes`.

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project}/${var.environment}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "aws_secretsmanager_secret" "db_url" {
  name = "${var.project}/${var.environment}/database-url"
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = "postgres://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.address}:5432/${var.db_name}"
}

# Placeholders — completar manualmente en la consola de AWS o vía `aws secretsmanager put-secret-value`.
# Terraform solo crea el secreto vacío; no gestiona el valor real para evitar
# que las claves de Stripe/SMTP queden en el state file o en este repo.
resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "${var.project}/${var.environment}/stripe-secret-key"
}

resource "aws_secretsmanager_secret" "stripe_webhook_secret" {
  name = "${var.project}/${var.environment}/stripe-webhook-secret"
}

resource "aws_secretsmanager_secret" "smtp_credentials" {
  name        = "${var.project}/${var.environment}/smtp-credentials"
  description = "JSON: {\"host\":\"\",\"port\":587,\"user\":\"\",\"pass\":\"\"}"
}
