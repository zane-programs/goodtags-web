output "url" {
  description = "Where the app is served once `wrangler deploy` has uploaded it."
  value       = "https://${cloudflare_workers_custom_domain.app.hostname}"
}

output "worker_name" {
  value = cloudflare_worker.app.name
}
