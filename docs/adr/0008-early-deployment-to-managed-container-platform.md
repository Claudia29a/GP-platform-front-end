# ADR-008 Early deployment of Docker containers to a managed container platform

**Status:** Accepted

## Context

Deployment was left until late in version 1, with Kubernetes planned and the cloud provider undecided. Problems with configuration, secrets and networking between services only show up in a real environment, and they are much cheaper to solve while the system is still small. Hosting must fit a student budget and be manageable by one person.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Kubernetes (AKS or EKS) from the start | Industry standard; full control over scaling and rollouts | Large setup and running cost; far more than three small services need now |
| Managed container platform: Azure Container Apps | Runs Docker images without managing a cluster; HTTPS, scaling and rolling updates built in; can scale idle services to zero to save credit; Azure for Students gives free credit without a credit card | Less control than Kubernetes; Azure-specific configuration |
| Managed container platform on AWS (App Runner or ECS) | Similar features | No comparable student credit without a credit card |
| A single virtual machine with Docker Compose | Cheapest and simplest | No managed HTTPS, scaling or rolling updates; everything done by hand |

## Decision

Every part of CareBridge runs as a Docker container. Locally, Docker Compose runs the whole platform. In the cloud, the containers run on Azure Container Apps, with a managed PostgreSQL server (ADR-005). The walking skeleton (increment 0) is deployed before any feature is built.

## Consequences

Every increment is shown on a running environment, and deployment problems appear early. Because the unit of deployment is a standard Docker image, moving to Kubernetes later needs no change to the services themselves. Kubernetes is reconsidered if Container Apps limits scaling or rollout control. The student credit offer is confirmed with a Fontys account in increment 0; if it is not available, the single-VM option is the fallback.
