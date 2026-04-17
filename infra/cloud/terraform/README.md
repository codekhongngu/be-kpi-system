# Terraform Infrastructure as Code

This directory contains Terraform configurations for infrastructure provisioning.

## Structure

- `main.tf` - Main Terraform configuration
- `variables.tf` - Variable definitions
- `outputs.tf` - Output values
- `modules/` - Reusable Terraform modules
- `environments/` - Environment-specific configurations (dev, staging, prod)

## Usage

```bash
# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply
```

## Environments

- `environments/dev/` - Development environment
- `environments/staging/` - Staging environment
- `environments/prod/` - Production environment
