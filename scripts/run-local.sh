#!/usr/bin/env bash
set -euo pipefail
export SPRING_PROFILES_ACTIVE=local
mvn spring-boot:run
