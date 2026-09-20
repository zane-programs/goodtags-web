output "url" {
  description = "Where the app is served."
  value       = "https://${cloudflare_workers_custom_domain.app.hostname}"
}
