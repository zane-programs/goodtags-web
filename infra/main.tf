# The hostname the goodtags web app answers on. Wrangler creates and deploys the Worker
# itself (see ../wrangler.jsonc), and must have done so once before this is applied:
# Cloudflare refuses to attach a custom domain to a Worker with no deployment.
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

# Creates the proxied DNS record and edge certificate for the hostname. A custom
# domain (rather than workers.dev) is also what gives the Worker a working edge cache.
resource "cloudflare_workers_custom_domain" "app" {
  account_id = var.account_id
  zone_id    = data.cloudflare_zone.app.zone_id
  hostname   = var.hostname
  service    = var.worker_name
}
