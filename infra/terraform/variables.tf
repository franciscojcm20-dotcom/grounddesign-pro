variable "aws_region" {
  description = "Región AWS donde se despliega todo."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Prefijo para nombrar todos los recursos."
  type        = string
  default     = "grounddesign-pro"
}

variable "environment" {
  description = "Nombre del entorno (prod, staging)."
  type        = string
  default     = "prod"
}

variable "db_instance_class" {
  description = "Clase de instancia RDS. db.t4g.micro alcanza para etapa inicial (~1-2k usuarios concurrentes bajos)."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Almacenamiento inicial en GB para RDS (gp3, autoscaling hasta db_max_allocated_storage)."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Tope de autoscaling de almacenamiento RDS en GB."
  type        = number
  default     = 100
}

variable "db_name" {
  type    = string
  default = "grounddesign"
}

variable "db_username" {
  type    = string
  default = "gdp"
}

variable "apprunner_api_cpu" {
  description = "vCPU para el servicio api (App Runner: 0.25, 0.5, 1, 2, 4)."
  type        = string
  default     = "0.5 vCPU"
}

variable "apprunner_api_memory" {
  type    = string
  default = "1 GB"
}

variable "apprunner_web_cpu" {
  type    = string
  default = "0.5 vCPU"
}

variable "apprunner_web_memory" {
  type    = string
  default = "1 GB"
}

variable "github_repo" {
  description = "owner/repo de GitHub para el rol OIDC de CD (ej. franciscojcm20-dotcom/grounddesign-pro)."
  type        = string
}

variable "web_url" {
  description = "URL pública del frontend, usada por CORS en la API. Se actualiza tras el primer deploy o al configurar dominio propio."
  type        = string
  default     = ""
}
