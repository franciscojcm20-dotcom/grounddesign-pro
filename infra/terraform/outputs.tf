output "api_url" {
  value       = "https://${aws_apprunner_service.api.service_url}"
  description = "URL pública del servicio api. Úsala como NEXT_PUBLIC_API_URL / build-arg al construir la imagen web."
}

output "web_url" {
  value       = "https://${aws_apprunner_service.web.service_url}"
  description = "URL pública del frontend. Actualiza la variable web_url y vuelve a aplicar para que la API la use en CORS."
}

output "ecr_api_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_web_repository_url" {
  value = aws_ecr_repository.web.repository_url
}

output "rds_endpoint" {
  value     = aws_db_instance.main.address
  sensitive = true
}

output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions_cd.arn
  description = "Pega este ARN en el secret AWS_ROLE_ARN del repo de GitHub."
}
