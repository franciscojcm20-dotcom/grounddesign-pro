# Permite que el workflow de GitHub Actions asuma un rol de AWS sin guardar
# credenciales de larga duración como secretos del repo (OIDC federation).

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

data "aws_iam_policy_document" "github_actions_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_actions_cd" {
  name               = "${var.project}-${var.environment}-github-cd"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume.json
}

data "aws_iam_policy_document" "github_actions_cd" {
  statement {
    sid       = "ECRAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "ECRPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
    ]
    resources = [aws_ecr_repository.api.arn, aws_ecr_repository.web.arn]
  }
  statement {
    sid       = "AppRunnerDeploy"
    actions   = ["apprunner:StartDeployment", "apprunner:DescribeService"]
    resources = [aws_apprunner_service.api.arn, aws_apprunner_service.web.arn]
  }
}

resource "aws_iam_role_policy" "github_actions_cd" {
  name   = "${var.project}-${var.environment}-github-cd"
  role   = aws_iam_role.github_actions_cd.id
  policy = data.aws_iam_policy_document.github_actions_cd.json
}
