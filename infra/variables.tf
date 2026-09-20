variable "account_id" {
  description = "Cloudflare account ID (Workers & Pages overview, or `wrangler whoami`)."
  type        = string
}

variable "zone_name" {
  description = "A zone already active in that account, e.g. example.com."
  type        = string
}

variable "hostname" {
  description = "Where the app is served, e.g. goodtags.example.com. The app needs the root of an origin, so use a dedicated hostname in the zone."
  type        = string

  validation {
    condition     = var.hostname == var.zone_name || endswith(var.hostname, ".${var.zone_name}")
    error_message = "hostname must be the zone itself or a name inside it."
  }
}

variable "worker_name" {
  description = "The Worker to serve, already deployed by `yarn deploy`. Matches `name` in wrangler.jsonc."
  type        = string
  default     = "goodtags-web"
}
