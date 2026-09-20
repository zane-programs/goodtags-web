# Account-level resources for the goodtags web app. Wrangler uploads the Worker's code
# and static assets (see ../wrangler.jsonc); this owns the Worker itself and the
# hostname it answers on, so deleting the stack removes everything it created.
#
# Deliberately not managed here: the zone, its other DNS records, and zone-wide rules.
# The zone usually serves more than this app, so it is only looked up, never changed
# beyond the one DNS record and certificate Cloudflare creates for the custom domain.

terraform {
  required_version = ">= 1.6"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.25"
    }
  }
}

# Authenticates with the CLOUDFLARE_API_TOKEN environment variable.
provider "cloudflare" {}

data "cloudflare_zone" "app" {
  filter = {
    name    = var.zone_name
    account = { id = var.account_id }
  }
}

resource "cloudflare_worker" "app" {
  account_id = var.account_id
  name       = var.worker_name
}

# Creates the proxied DNS record and edge certificate for the hostname. A custom
# domain (rather than workers.dev) is also what gives the Worker a working edge cache.
resource "cloudflare_workers_custom_domain" "app" {
  account_id = var.account_id
  zone_id    = data.cloudflare_zone.app.zone_id
  hostname   = var.hostname
  service    = cloudflare_worker.app.name
}
