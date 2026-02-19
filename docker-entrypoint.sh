#!/bin/sh
set -e

echo "================================================"
echo "  TimeWise - Time Zone & Meeting Planner Hub"
echo "================================================"
echo ""

DB_MAX_RETRIES="${DB_MAX_RETRIES:-60}"
DB_RETRY_DELAY="${DB_RETRY_DELAY:-2}"

# ── Wait for database (Prisma-based probe) ─────────────────
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Waiting for database to be ready..."
  RETRIES=0
  until npx prisma db execute --stdin <<'SQL' 2>/dev/null
SELECT 1;
SQL
  do
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$DB_MAX_RETRIES" ]; then
      echo "❌ Database not reachable after $DB_MAX_RETRIES attempts. Exiting."
      exit 1
    fi
    if [ $((RETRIES % 5)) -eq 0 ]; then
      echo "   Still waiting for database... (attempt ${RETRIES}/${DB_MAX_RETRIES})"
    fi
    sleep "$DB_RETRY_DELAY"
  done
  echo "✅ Database connection ready"

  # ── Run migrations ──────────────────────────────────────
  echo "📦 Running database migrations..."
  if ! npx prisma migrate deploy 2>&1; then
    echo "❌ Migration failed. Please check your migration files."
    exit 1
  fi
  echo "✅ Migrations applied"

  # ── Conditional seed ────────────────────────────────────
  if [ "$FORCE_SEED" = "true" ]; then
    echo "🌱 FORCE_SEED=true — running seed..."
    npx prisma db seed 2>&1 || echo "⚠️  Seed had warnings, continuing..."
  else
    # Seed only if no admin user exists (first run)
    ADMIN_COUNT=$(npx prisma db execute --stdin <<'SQL' 2>/dev/null | grep -c "ADMIN" || true
SELECT role FROM "User" WHERE role = 'ADMIN' LIMIT 1;
SQL
    )
    if [ "$ADMIN_COUNT" -eq 0 ] 2>/dev/null; then
      echo "🌱 No admin user found — running initial seed..."
      npx prisma db seed 2>&1 || echo "⚠️  Seed had warnings, continuing..."
    else
      echo "✅ Database already seeded (admin user exists), skipping seed"
    fi
  fi
  echo ""
fi

echo "🚀 Starting TimeWise server on port ${PORT:-3000}..."
echo ""
exec node server.js
