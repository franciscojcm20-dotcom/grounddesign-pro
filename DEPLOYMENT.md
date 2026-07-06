# Despliegue — GroundDesign Pro en AWS

Arquitectura: **App Runner** (api + web) + **RDS Postgres** (privado, vía VPC Connector) + **ECR** + **Secrets Manager**. CI construye y testea en cada push; el job `deploy` en `.github/workflows/ci.yml` publica en AWS solo en `main`, vía un rol IAM federado con GitHub OIDC (sin llaves de larga duración).

Costo aproximado en reposo: RDS `db.t4g.micro` (~US$12/mes) + 2 servicios App Runner a 0.5 vCPU/1GB en mínimo de escala (~US$5-10/mes c/u) + ECR/Secrets Manager (centavos). Total inicial: **~US$25-35/mes**, escala con tráfico real.

## Prerrequisitos

- Cuenta de AWS con permisos de administrador (o un usuario con permisos para IAM, VPC, RDS, ECR, App Runner, Secrets Manager).
- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.6 y [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) instalados localmente.
- `aws configure` ya corrido con credenciales de tu cuenta (solo para este bootstrap manual — el CD en GitHub Actions no usa estas credenciales, usa OIDC).

## 1. (Opcional pero recomendado) State remoto de Terraform

Sin esto, el `terraform.tfstate` queda en tu disco y se pierde si cambias de máquina. Para un solo dev es opcional al inicio; si más adelante trabajas desde otra máquina, crea un bucket S3 y descomenta el bloque `backend "s3"` en `infra/terraform/versions.tf`:

```bash
aws s3api create-bucket --bucket grounddesign-pro-tfstate --region us-east-1
aws s3api put-bucket-versioning --bucket grounddesign-pro-tfstate --versioning-configuration Status=Enabled
```

## 2. Bootstrap — primer despliegue (dos fases, por la dependencia circular api↔web)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# editar terraform.tfvars: confirmar github_repo

terraform init
terraform apply
```

Esto crea VPC, RDS, ECR, Secrets Manager, roles IAM y **ambos** servicios App Runner — pero App Runner exige que exista una imagen en ECR antes de poder arrancar el servicio, así que el primer `apply` fallará al crear `aws_apprunner_service.api`/`.web` si los repos ECR están vacíos. Antes de aplicar, sube una imagen mínima a cada repo:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -f apps/api/Dockerfile -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/grounddesign-pro-api:latest .
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/grounddesign-pro-api:latest

docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/grounddesign-pro-web:latest .
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/grounddesign-pro-web:latest
```

Luego sí:

```bash
terraform apply
terraform output   # anota api_url y web_url
```

## 3. Cerrar el círculo api ↔ web

1. Reconstruye y sube la imagen **web** con `NEXT_PUBLIC_API_URL` apuntando al `api_url` real que salió del output (Next.js hornea esta variable en build-time, no se puede cambiar en runtime):
   ```bash
   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=<api_url del output> -t <repo-web>:latest .
   docker push <repo-web>:latest
   aws apprunner start-deployment --service-arn <arn del servicio web>
   ```
2. Edita `terraform.tfvars`: `web_url = "<web_url del output>"` y vuelve a aplicar (`terraform apply`) para que la API acepte ese origen en CORS.

## 4. Completar los secretos que Terraform deja vacíos

Stripe y SMTP no se gestionan por Terraform (para no dejarlos en el state file). Complétalos en la consola de Secrets Manager o por CLI:

```bash
aws secretsmanager put-secret-value --secret-id grounddesign-pro/prod/stripe-secret-key --secret-string "sk_live_..."
aws secretsmanager put-secret-value --secret-id grounddesign-pro/prod/stripe-webhook-secret --secret-string "whsec_..."
aws secretsmanager put-secret-value --secret-id grounddesign-pro/prod/smtp-credentials --secret-string '{"host":"smtp.resend.com","port":587,"user":"resend","pass":"..."}'
```

Luego actualiza `apps/api/src/lib/mailer.ts` / `apps/api/src/routes/billing.ts` si hace falta adaptar cómo se leen (hoy leen variables de entorno planas `SMTP_HOST`, `SMTP_USER`, etc. — si usas el JSON de `smtp-credentials`, ajusta `apprunner.tf` para inyectarlas como variables separadas en vez de un solo JSON, o cambia el código para parsear el JSON).

## 5. Configurar GitHub Actions (CD automático)

En **Settings → Secrets and variables → Actions** del repo:

**Secrets:**
- `AWS_ROLE_ARN` = output `github_actions_role_arn` de Terraform

**Variables:**
- `AWS_REGION` = `us-east-1` (o la región usada)
- `ECR_API_REPO` = output `ecr_api_repository_url`
- `ECR_WEB_REPO` = output `ecr_web_repository_url`
- `API_SERVICE_ARN` = ARN del servicio api (`aws apprunner list-services`)
- `WEB_SERVICE_ARN` = ARN del servicio web
- `NEXT_PUBLIC_API_URL` = el `api_url` del output

Desde este punto, cada push a `main` que pase CI construye ambas imágenes, las sube a ECR con tag `latest` + el SHA del commit, y dispara el deployment en App Runner automáticamente (job `deploy` en `ci.yml`).

## 6. Dominio propio (cuando lo compres)

1. Añade un registro CNAME desde tu dominio hacia la URL de App Runner (o usa Route 53 + `aws_apprunner_custom_domain_association` en Terraform).
2. Actualiza `FROM_EMAIL`, `NEXT_PUBLIC_API_URL`, `web_url`/`WEB_URL` y vuelve a construir/aplicar.
3. Verifica el dominio en Stripe (webhook endpoint) y en tu proveedor SMTP (SPF/DKIM del dominio nuevo).

## Rollback

App Runner conserva las imágenes anteriores en ECR (últimas 10 por la lifecycle policy). Para revertir:

```bash
aws ecr batch-get-image --repository-name grounddesign-pro-api --image-ids imageTag=<sha-anterior>
docker tag <esa imagen> <repo>:latest && docker push <repo>:latest
aws apprunner start-deployment --service-arn <arn>
```

## Lo que este setup NO resuelve todavía

- Migraciones de base de datos versionadas (sigue siendo `schema.sql` aplicado una vez) — próximo ítem del roadmap de auditoría.
- Observabilidad (Sentry/métricas/alerting).
- Ambiente de staging separado (hoy Terraform soporta `environment = "staging"` como variable, pero requiere un segundo `terraform apply` con su propio `.tfvars` y, idealmente, state remoto separado).
